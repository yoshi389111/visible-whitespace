import * as vscode from 'vscode';

export const activate = (context: vscode.ExtensionContext): void => {

    const getConfig = () => vscode.workspace.getConfiguration('visibleWhitespace');

    const isLanguageEnabled = (languageId: string): boolean => {
        const enabledLanguages = getConfig().get<string[]>("enabledLanguageIds", []);
        return enabledLanguages.length === 0 || enabledLanguages.includes(languageId);
    };

    const dispose = (decoType: { dispose(): any }) => {
        const index = context.subscriptions.indexOf(decoType);
        if (index !== -1) {
            context.subscriptions.splice(index, 1);
        }
        decoType.dispose();
    };

    /** Mapping target whitespaces to decoration-types. */
    const decoTypeMap = new Map<string, vscode.TextEditorDecorationType>();
    /** list of whitespace regex parts. */
    const regexParts: string[] = [];

    const createResources = (): void => {
        Array.from(decoTypeMap.values()).forEach(it => dispose(it));
        decoTypeMap.clear();
        regexParts.length = 0;

        const config = getConfig();
        const overlayColor = config.get<string>('overlayColor', "rgba(128,128,128,1)");
        if (config.get<boolean>('htab.enable', false)) {
            // for Horizontal Tabulation (U+0009)
            const decoTab = vscode.window.createTextEditorDecorationType({
                before: {
                    width: "0",
                    contentText: config.get<string>('htab.text', "\u2192"),
                    color: overlayColor,
                },
                rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
            });
            decoTypeMap.set("\u0009", decoTab);
            regexParts.push("\u0009");
        }

        if (config.get<boolean>('newLine.enable', true)) {
            const newLineColor = config.get<string>('newLine.color', "rgba(128,128,128,1)");
            // for New Line (U+000A)
            const decoLf = vscode.window.createTextEditorDecorationType({
                before: {
                    width: "0",
                    contentText: config.get<string>('newLine.lf', "\u2193"),
                    color: newLineColor,
                },
                rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
            });
            decoTypeMap.set("\u000a", decoLf);
            // for Carriage Return (U+000D) + New Line (U+000A)
            const decoCrLf = vscode.window.createTextEditorDecorationType({
                before: {
                    width: "0",
                    contentText: config.get<string>('newLine.crLf', "\u21b2"),
                    color: newLineColor,
                },
                rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
            });
            decoTypeMap.set("\u000d\u000a", decoCrLf);
            regexParts.push("\u000d?\u000a");
        }
        if (config.get<boolean>('space.enable', false)) {
            // for Space (U+0020)
            const decoSpace = vscode.window.createTextEditorDecorationType({
                before: {
                    width: "0",
                    contentText: config.get<string>('space.text', "\u00b7"),
                    color: overlayColor,
                },
                rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
            });
            decoTypeMap.set("\u0020", decoSpace);
            regexParts.push("\u0020");
        }
        if (config.get<boolean>('nbsp.enable', true)) {
            // for No-Break Space (U+00A0)
            const decoNoBreakSpace = vscode.window.createTextEditorDecorationType({
                before: {
                    width: "0",
                    contentText: config.get<string>('nbsp.text', "\u2337"),
                    color: overlayColor,
                },
                rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
            });
            decoTypeMap.set("\u00a0", decoNoBreakSpace);
            regexParts.push("\u00a0");
        }
        if (config.get<boolean>('widespace.enable', true)) {
            // for Ideographic Space (U+3000)
            const decoWideSpace = vscode.window.createTextEditorDecorationType({
                before: {
                    width: "0",
                    contentText: config.get<string>('widespace.text', "\u2395"),
                    color: overlayColor,
                },
                rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
            });
            decoTypeMap.set("\u3000", decoWideSpace);
            regexParts.push("\u3000");
        }
        if (config.get<boolean>('other.enable', true)) {
            // for other whitespace (U+180E, U+2000-U+200A, U+202F, U+205F, U+2800)
            const decoOthers = vscode.window.createTextEditorDecorationType({
                borderColor: config.get<string>('other.borderColor', "rgba(235,97,1,1)"),
                borderWidth: "1px",
                borderStyle: "solid",
                borderRadius: "25%",
                borderSpacing: "1px 1px",
                rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
            });
            decoTypeMap.set("other", decoOthers);
            regexParts.push("[\u180e\u2000-\u200a\u202f\u205f\u2800]");
        }
        if (config.get<boolean>('eof.enable', true)) {
            // for End of File
            const decoEof = vscode.window.createTextEditorDecorationType({
                after: {
                    width: "0",
                    contentText: config.get<string>('eof.text', "[EOF]"),
                    color: config.get<string>('eof.color', "rgba(128,128,128,1)"),
                },
                rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
            });
            decoTypeMap.set("eof", decoEof);
        }
        context.subscriptions.push(...decoTypeMap.values());
    };
    createResources();

    const updateDecorations = (editor: vscode.TextEditor): void => {
        const options = Array.from(decoTypeMap.values()).reduce(
            (map, decoType) => map.set(decoType, []),
            new Map<vscode.TextEditorDecorationType, vscode.DecorationOptions[]>());
        const text = editor.document.getText();
        const regex = new RegExp(regexParts.join("|"), "g");
        const decoOther = decoTypeMap.get("other");

        Array.from(text.matchAll(regex)).forEach(match => {
            // `match.index` returned by `matchAll()` must exist.
            // ref. https://github.com/microsoft/TypeScript/issues/36788
            const startPos = match.index!;
            const target = match[0];
            const range = new vscode.Range(
                editor.document.positionAt(startPos),
                editor.document.positionAt(startPos + target.length)
            );
            const decoType = decoTypeMap.get(target);
            if (decoType) {
                options.get(decoType)?.push({ range });
            } else if (decoOther) {
                const hoverMessage = `U+${target.codePointAt(0)?.toString(16).padStart(4, '0')}`;
                options.get(decoOther)?.push({
                    range, hoverMessage });
            }
        });

        const decoEof = decoTypeMap.get("eof");
        if (decoEof) {
            const eofPosition = editor.document.positionAt(text.length);
            const range = new vscode.Range(eofPosition, eofPosition);
            options.get(decoEof)?.push({ range });
        }

        options.forEach((decoOptions, decoType) => editor.setDecorations(decoType, decoOptions));
    };

    const updateDecorationsIfPossible = (): void => {
        const editor = vscode.window.activeTextEditor;
        if (editor && isLanguageEnabled(editor.document.languageId)) {
            updateDecorations(editor);
        }
    };

    let timer: NodeJS.Timer | undefined = undefined;
    const triggerUpdateDecorations = (throttle = false): void => {
        if (timer) {
            clearTimeout(timer);
            timer = undefined;
        }
        if (throttle) {
            const updateDelay = getConfig().get<number>('updateDelay', 100);
            timer = setTimeout(updateDecorationsIfPossible, updateDelay);
        } else {
            updateDecorationsIfPossible();
        }
    };
    triggerUpdateDecorations();

    vscode.window.onDidChangeActiveTextEditor(editor => {
        triggerUpdateDecorations();
    }, null, context.subscriptions);

    vscode.workspace.onDidChangeTextDocument(event => {
        const editor = vscode.window.activeTextEditor;
        if (editor && event.document === editor.document) {
            triggerUpdateDecorations(true);
        }
    }, null, context.subscriptions);

    vscode.workspace.onDidChangeConfiguration(_ => {
        createResources();
        triggerUpdateDecorations();
    }, null, context.subscriptions);
};

export const deactivate = (): void => { };
