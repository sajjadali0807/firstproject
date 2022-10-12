"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusBarTimer = void 0;
const vscode = require("vscode");
class StatusBarTimer {
    constructor() {
        this.secondsRemaining = 0;
        this.onDidChangeConfiguration = (config) => {
            var _a;
            if (((_a = this.config) === null || _a === void 0 ? void 0 : _a.enableComboTimer) === config.enableComboTimer) {
                return;
            }
            this.config = config;
            if (!this.config.enableComboTimer) {
                this.stopTimer();
            }
        };
        /**
         * Starts a "progress" in the bottom of the vscode window
         * which displays the time remaining for the current combo
         */
        this.startTimer = (timeLimit) => {
            var _a;
            if (!((_a = this.config) === null || _a === void 0 ? void 0 : _a.enableComboTimer)) {
                return;
            }
            if (timeLimit === 0) {
                return;
            }
            this.stopTimer();
            this.active = true;
            this.secondsRemaining = timeLimit;
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Window,
            }, p => {
                return new Promise((resolve, reject) => {
                    // Storing reject will allow us to
                    // cancel the progress
                    this.progressDisposer = reject;
                    p.report({ message: this.getProgressMessage() });
                    this.timerHandle = setInterval(() => {
                        this.secondsRemaining--;
                        p.report({ message: this.getProgressMessage() });
                        if (this.secondsRemaining <= 0) {
                            this.stopTimer();
                        }
                    }, 1000);
                });
            });
        };
        this.extendTimer = (timeLimit) => {
            this.secondsRemaining = timeLimit;
        };
        /**
         * Disposes the progress and clears the timer that controls it
         */
        this.stopTimer = () => {
            this.active = null;
            clearInterval(this.timerHandle);
            this.timerHandle = null;
            if (this.progressDisposer) {
                this.progressDisposer();
                this.progressDisposer = null;
            }
        };
        /**
         * Builds a message based on how much time is left on the timer
         * @returns The progress message
         */
        this.getProgressMessage = () => {
            const secondsString = Math.floor(this.secondsRemaining);
            return `Combo Timer: ${secondsString} seconds`;
        };
    }
    dispose() {
        this.stopTimer();
    }
    onPowermodeStart(combo) {
        // Do nothing
    }
    onPowermodeStop(combo) {
        // Do nothing
    }
    onComboStop(finalCombo) {
        this.stopTimer();
    }
    onDidChangeTextDocument(data, event) {
        var _a;
        if (!((_a = this.config) === null || _a === void 0 ? void 0 : _a.enableComboTimer)) {
            return;
        }
        if (!this.active) {
            this.startTimer(data.comboTimeout);
        }
        else {
            this.extendTimer(data.comboTimeout);
        }
    }
}
exports.StatusBarTimer = StatusBarTimer;
//# sourceMappingURL=status-bar-timer.js.map