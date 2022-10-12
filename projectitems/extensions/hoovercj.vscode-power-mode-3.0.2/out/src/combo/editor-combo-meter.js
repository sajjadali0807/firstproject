"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EditorComboMeter = void 0;
const vscode = require("vscode");
class EditorComboMeter {
    constructor() {
        this.disposables = [];
        this.renderedRange = undefined;
        this.renderedComboCount = undefined;
        this.combo = 0;
        this.isPowermodeActive = false;
        this.initialPowermodeCombo = 0;
        this.timerDurationInMilliseconds = 0;
        this.timerExpirationTimestampInMilliseconds = 0;
        this.TIMER_UPDATE_INTERVAL = 50;
        this.dispose = () => {
            this.removeDecorations();
            while (this.disposables.length) {
                this.disposables.shift().dispose();
            }
        };
        this.onPowermodeStart = (combo) => {
            this.isPowermodeActive = true;
            this.initialPowermodeCombo = combo;
        };
        this.onPowermodeStop = (finalCombo) => {
            this.isPowermodeActive = false;
            this.initialPowermodeCombo = 0;
        };
        this.onComboStop = (finalCombo) => {
            this.combo = 0;
            this.removeDecorations();
        };
        this.onDidChangeTextDocument = (data, event) => {
            this.combo = data.currentCombo;
            this.timerDurationInMilliseconds = data.comboTimeout * 1000;
            this.timerExpirationTimestampInMilliseconds = new Date().getTime() + this.timerDurationInMilliseconds;
            this.isPowermodeActive = data.isPowermodeActive;
            this.updateDecorations(data.activeEditor);
        };
        this.onDidChangeConfiguration = (config) => {
            var _a, _b, _c;
            const oldEnableComboCounter = (_a = this.config) === null || _a === void 0 ? void 0 : _a.enableComboCounter;
            const oldEnableComboTimer = (_b = this.config) === null || _b === void 0 ? void 0 : _b.enableComboTimer;
            const oldComboCounterSize = (_c = this.config) === null || _c === void 0 ? void 0 : _c.comboCounterSize;
            this.config = config;
            if (this.config.enableComboCounter === oldEnableComboCounter &&
                this.config.enableComboTimer === oldEnableComboTimer &&
                this.config.comboCounterSize === oldComboCounterSize) {
                return;
            }
            this.removeDecorations();
        };
        this.activate = () => {
            this.disposables.push(vscode.window.onDidChangeTextEditorVisibleRanges((e) => {
                this.updateDecorations(e.textEditor);
            }));
        };
        this.removeDecorations = () => {
            this.renderedComboCount = 0;
            this.renderedRange = undefined;
            if (this.comboCountDecoration) {
                this.comboCountDecoration.dispose();
                this.comboCountDecoration = null;
            }
            if (this.comboCountAnimationTimer) {
                clearTimeout(this.comboCountAnimationTimer);
                this.comboCountAnimationTimer = null;
            }
            if (this.comboTimerDecoration) {
                this.comboTimerDecoration.dispose();
                this.comboTimerDecoration = null;
            }
            if (this.comboTimerDecorationTimer) {
                clearInterval(this.comboTimerDecorationTimer);
                this.comboTimerDecorationTimer = null;
            }
        };
        this.updateDecorations = (editor) => {
            if (!this.enabled) {
                return;
            }
            const firstVisibleRange = editor.visibleRanges.sort().find(range => !range.isEmpty);
            if (!firstVisibleRange || this.combo < 1) {
                this.removeDecorations();
                return;
            }
            const position = firstVisibleRange.start;
            const range = new vscode.Range(position, position);
            if (this.combo !== this.renderedComboCount || !range.isEqual(this.renderedRange)) {
                this.renderedComboCount = this.combo;
                this.renderedRange = range;
                const ranges = [range];
                this.createComboCountDecoration(this.combo, ranges, editor);
                this.createComboTimerDecoration(ranges, editor);
            }
        };
        this.getSharedStyles = (comboCount, frameCount = 0) => {
            // Because the size and color do not start to change until Power Mode starts, we cannot use the raw "count" to calculate those values
            // or else there will be a large jump when powermode activates, so instead use the value relative to the combo at which Power Mode started.
            const powerModeCombo = this.isPowermodeActive ? comboCount - this.initialPowermodeCombo : 0;
            const baseTextSize = this.config.comboCounterSize;
            const styleCount = Math.min(powerModeCombo, 25);
            // TODO: Explain how this formula works
            const textSize = this.isPowermodeActive ? ((styleCount * baseTextSize) / 100 * Math.pow(0.5, frameCount * 0.2) + baseTextSize) : baseTextSize;
            // Only change color in power mode
            const color = `hsl(${(100 - (this.isPowermodeActive ? powerModeCombo : 0) * 1.2)}, 100%, 45%)`;
            return { textSize: `${textSize}em`, color };
        };
        this.createComboCountDecoration = (count, ranges, editor = vscode.window.activeTextEditor) => {
            clearTimeout(this.comboCountAnimationTimer);
            if (!this.config.enableComboCounter) {
                return;
            }
            const animateComboCountDecoration = (frameCount) => {
                var _a;
                (_a = this.comboCountDecoration) === null || _a === void 0 ? void 0 : _a.dispose();
                const { textSize, color } = this.getSharedStyles(count, frameCount);
                const baseCss = EditorComboMeter.objectToCssString({
                    ["font-size"]: textSize,
                    ["text-shadow"]: `0px 0px 15px ${color}`,
                });
                const lightThemeCss = EditorComboMeter.objectToCssString({
                    // Because the text is a very light color, a colored stroke is needed
                    // to make it stand out sufficiently on a light theme
                    ["-webkit-text-stroke"]: `2px ${color}`,
                });
                const createComboCountAfterDecoration = (lightTheme) => {
                    return {
                        after: {
                            margin: "0.5em 0 0 0",
                            contentText: `${count}×`,
                            color: "#FFFFFF",
                            textDecoration: `none; ${EditorComboMeter.DEFAULT_CSS} ${baseCss} ${lightTheme ? lightThemeCss : ""}`,
                        }
                    };
                };
                this.comboCountDecoration = vscode.window.createTextEditorDecorationType(Object.assign(Object.assign({}, createComboCountAfterDecoration()), { rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed, light: createComboCountAfterDecoration(true) }));
                editor.setDecorations(this.comboCountDecoration, ranges);
                // Only animate in power mode
                if (this.isPowermodeActive && frameCount < 100) {
                    this.comboCountAnimationTimer = setTimeout(() => {
                        animateComboCountDecoration(frameCount + 1);
                    }, 
                    // Ease-out the animation
                    20 + (0.5 * frameCount));
                }
            };
            animateComboCountDecoration(0);
        };
        this.activate();
    }
    get enabled() {
        var _a, _b;
        return ((_a = this.config) === null || _a === void 0 ? void 0 : _a.enableComboCounter) || ((_b = this.config) === null || _b === void 0 ? void 0 : _b.enableComboTimer);
    }
    createComboTimerDecoration(ranges, editor = vscode.window.activeTextEditor) {
        clearTimeout(this.comboTimerDecorationTimer);
        if (!this.config.enableComboTimer) {
            return;
        }
        const updateComboTimerDecoration = () => {
            var _a, _b;
            const timeLeft = this.timerExpirationTimestampInMilliseconds - new Date().getTime();
            if (timeLeft <= 0) {
                clearTimeout(this.comboTimerDecorationTimer);
                (_a = this.comboTimerDecoration) === null || _a === void 0 ? void 0 : _a.dispose();
                return;
            }
            const timerWidth = (timeLeft / this.timerDurationInMilliseconds) * 1.5;
            const { textSize, color } = this.getSharedStyles(this.combo);
            const baseCss = EditorComboMeter.objectToCssString({
                ["font-size"]: textSize,
                ["box-shadow"]: `0px 0px 15px ${color}`,
            });
            const lightThemeCss = EditorComboMeter.objectToCssString({
                // Because the text is a very light color, a colored stroke is needed
                // to make it stand out sufficiently on a light theme
                ["border"]: `2px solid ${color}`,
            });
            const createComboTimerBeforeDecoration = (lightTheme) => {
                return {
                    before: {
                        contentText: "",
                        backgroundColor: "white",
                        width: `${timerWidth}em`,
                        color: "white",
                        height: "8px",
                        textDecoration: `none; ${EditorComboMeter.DEFAULT_CSS} ${baseCss} ${lightTheme ? lightThemeCss : ""}`,
                    }
                };
            };
            (_b = this.comboTimerDecoration) === null || _b === void 0 ? void 0 : _b.dispose();
            this.comboTimerDecoration = vscode.window.createTextEditorDecorationType(Object.assign(Object.assign({}, createComboTimerBeforeDecoration()), { rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed, light: createComboTimerBeforeDecoration(true) }));
            editor.setDecorations(this.comboTimerDecoration, ranges);
        };
        this.comboTimerDecorationTimer = setInterval(updateComboTimerDecoration, this.TIMER_UPDATE_INTERVAL);
    }
    static objectToCssString(settings) {
        let value = '';
        const cssString = Object.keys(settings).map(setting => {
            value = settings[setting];
            if (typeof value === 'string' || typeof value === 'number') {
                return `${setting}: ${value};`;
            }
        }).join(' ');
        return cssString;
    }
}
exports.EditorComboMeter = EditorComboMeter;
EditorComboMeter.DEFAULT_CSS = EditorComboMeter.objectToCssString({
    position: 'absolute',
    // NOTE: This positions the element off the screen when there is horizontal scroll
    // so this feature works best when "word wrap" is enabled.
    // Using "5vw" instead did not limit the position to the viewable width.
    right: "5%",
    top: "20px",
    ['font-family']: "monospace",
    ['font-weight']: "900",
    // NOTE: Suggestion UI will still appear on top of the combo, but that is probaly a good thing
    // so the extension doesn't interfere with actual usage of the product
    ['z-index']: 1,
    ['pointer-events']: 'none',
    ["text-align"]: "center",
});
//# sourceMappingURL=editor-combo-meter.js.map