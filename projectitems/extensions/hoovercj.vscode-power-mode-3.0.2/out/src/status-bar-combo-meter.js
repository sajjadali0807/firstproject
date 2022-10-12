"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusBarComboMeter = void 0;
const vscode = require("vscode");
const config_1 = require("./config/config");
class StatusBarComboMeter {
    constructor() {
        this.config = {};
        this.activate = () => {
            if (this.statusBarItem) {
                return;
            }
            this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
            this.statusBarItem.show();
        };
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
            this.config.enableStatusBarComboCounter = (0, config_1.getConfigValue)('enableStatusBarComboCounter', config, {});
            // this.config.enableStatusBarComboCounter = config.get<boolean>('enableStatusBarComboCounter', true);
            if (this.config.enableStatusBarComboCounter) {
                this.activate();
            }
            else {
                this.dispose();
            }
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