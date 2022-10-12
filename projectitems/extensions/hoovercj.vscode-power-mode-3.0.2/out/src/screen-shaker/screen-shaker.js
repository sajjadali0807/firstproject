"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScreenShaker = void 0;
const vscode = require("vscode");
const config_1 = require("../config/config");
class ScreenShaker {
    constructor(themeConfig) {
        this.themeConfig = themeConfig;
        this.shakeDecorations = [];
        this.config = {};
        // A range that represents the full document. A top margin is applied
        // to this range which will push every line down the desired amount
        this.fullRange = [new vscode.Range(new vscode.Position(0, 0), new vscode.Position(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER))];
        this.dispose = () => {
            clearTimeout(this.shakeTimeout);
            this.shakeDecorations.forEach(decoration => decoration.dispose());
        };
        this.onPowermodeStart = (combo) => {
            // Do nothing
        };
        this.onPowermodeStop = (combo) => {
            var _a;
            (_a = this.unshake) === null || _a === void 0 ? void 0 : _a.call(this);
        };
        this.onComboStop = (finalCombo) => {
            // Do nothing
        };
        this.onDidChangeTextDocument = (data, event) => {
            if (!this.config["shake.enable"] || !data.isPowermodeActive) {
                return;
            }
            this.shake(data.activeEditor);
        };
        this.onDidChangeConfiguration = (config) => {
            const newConfig = {
                "shake.enable": (0, config_1.getConfigValue)('shake.enabled', config, this.themeConfig),
                "shake.intensity": (0, config_1.getConfigValue)('shake.intensity', config, this.themeConfig),
            };
            let changed = false;
            Object.keys(newConfig).forEach(key => {
                if (this.config[key] !== newConfig[key]) {
                    changed = true;
                }
            });
            if (!changed) {
                return;
            }
            const oldConfig = this.config;
            this.config = newConfig;
            // If it is enabled but was not before, activate
            if (this.config["shake.enable"] && !oldConfig["shake.enable"]) {
                this.activate();
                return;
            }
            // If the shake intensity changed recreate the screen shaker
            if (this.config["shake.intensity"] !== oldConfig["shake.intensity"]) {
                this.activate();
                return;
            }
            // If it is now disabled, unshake the screen
            if (!this.config["shake.enable"]) {
                this.dispose();
                return;
            }
        };
        this.activate = () => {
            this.dispose();
            this.negativeX = vscode.window.createTextEditorDecorationType({
                textDecoration: `none; margin-left: 0px;`
            });
            this.positiveX = vscode.window.createTextEditorDecorationType({
                textDecoration: `none; margin-left: ${this.config["shake.intensity"]}px;`
            });
            this.negativeY = vscode.window.createTextEditorDecorationType({
                textDecoration: `none; line-height:inherit`
            });
            this.positiveY = vscode.window.createTextEditorDecorationType({
                textDecoration: `none; line-height:${(this.config["shake.intensity"] / 2) + 1};`,
            });
            this.shakeDecorations = [
                this.negativeX,
                this.positiveX,
                this.negativeY,
                this.positiveY
            ];
        };
        /**
         * "Shake" the screen by applying decorations that set margins
         * to move them horizontally or vertically
         */
        this.shake = (editor) => {
            if (!this.config["shake.enable"]) {
                return;
            }
            // A range is created for each line in the document that only applies to the first character
            // This pushes each line to the right by the desired amount without adding spacing between characters
            const xRanges = [];
            for (let i = 0; i < editor.document.lineCount; i++) {
                let textStart = editor.document.lineAt(i).firstNonWhitespaceCharacterIndex;
                xRanges.push(new vscode.Range(new vscode.Position(i, textStart), new vscode.Position(i, textStart + 1)));
            }
            // For each direction, the "opposite" decoration needs cleared
            // before applying the chosen decoration.
            // This approach is used so that the decorations themselves can
            // be reused. My assumption is that this is more performant than
            // disposing and creating a new decoration each time.
            if (Math.random() > 0.5) {
                editor.setDecorations(this.negativeX, []);
                editor.setDecorations(this.positiveX, xRanges);
            }
            else {
                editor.setDecorations(this.positiveX, []);
                editor.setDecorations(this.negativeX, xRanges);
            }
            if (Math.random() > 0.5) {
                editor.setDecorations(this.negativeY, []);
                editor.setDecorations(this.positiveY, this.fullRange);
            }
            else {
                editor.setDecorations(this.positiveY, []);
                editor.setDecorations(this.negativeY, this.fullRange);
            }
            this.unshake = () => {
                this.shakeDecorations.forEach(decoration => {
                    // Decorations are set to an empty array insetad of being disposed
                    // because it is cheaper to reuse the same decoration later than recreate it
                    try {
                        editor.setDecorations(decoration, []);
                    }
                    catch (_a) {
                        // This might fail if the editor is no longer available.
                        // But at that point, there's no need to set decorations on it,
                        // so that's fine!
                    }
                });
            };
            clearTimeout(this.shakeTimeout);
            this.shakeTimeout = setTimeout(this.unshake, 1000);
        };
    }
}
exports.ScreenShaker = ScreenShaker;
//# sourceMappingURL=screen-shaker.js.map