"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusBarComboMeter = void 0;
const vscode = require("vscode");
class StatusBarComboMeter {
    constructor() {
        this.dispose = () => {
            if (!this.statusBarItem) {
                return;
            }
            this.statusBarItem.dispose();
            this.statusBarItem = null;
        };
        this.onPowermodeStart = (combo) => {
            // Do nothing
        };
        this.onPowermodeStop = (combo) => {
            // Do nothing
        };
        this.onComboStart = (combo) => {
            this.updateStatusBar(combo);
        };
        this.onComboStop = (combo) => {
            this.updateStatusBar(combo);
        };
        this.onDidChangeTextDocument = (data, event) => {
            this.updateStatusBar(data.currentCombo, data.isPowermodeActive);
        };
        this.onDidChangeConfiguration = (config) => {
            var _a;
            if (((_a = this.config) === null || _a === void 0 ? void 0 : _a.enableComboCounter) === config.enableComboCounter) {
                return;
            }
            this.config = config;
            if (this.config.enableComboCounter) {
                this.activate();
            }
            else {
                this.dispose();
            }
        };
        this.activate = () => {
            if (this.statusBarItem) {
                return;
            }
            this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
            this.statusBarItem.show();
        };
        this.updateStatusBar = (combo, powermode) => {
            if (!this.statusBarItem) {
                return;
            }
            const prefix = powermode ? 'POWER MODE!!! ' : '';
            this.statusBarItem.text = `${prefix}Combo: ${combo}`;
        };
    }
}
exports.StatusBarComboMeter = StatusBarComboMeter;
//# sourceMappingURL=status-bar-combo-meter.js.map