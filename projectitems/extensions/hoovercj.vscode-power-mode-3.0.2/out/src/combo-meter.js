"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComboMeter = void 0;
const vscode = require("vscode");
class ComboMeter {
    constructor() {
        this.config = {};
        this.renderedComboCount = undefined;
        this.combo = 0;
        this.isPowermodeActive = false;
        this.initialPowermodeCombo = 0;
        this.enabled = false;
        this.timerDurationInMilliseconds = 0;
        this.timerExpirationTimestampInMilliseconds = 0;
        this.TIMER_UPDATE_INTERVAL = 50;
        this.TIMER_DECORATION_HEIGHT = 10;
        this.activate = () => {
            vscode.window.onDidChangeTextEditorVisibleRanges((e) => {
                this.updateDecorations(e.textEditor);
            });
        };
        this.dispose = () => {
            if (this.comboCountDecoration) {
                clearTimeout(this.comboCountAnimationTimer);
                this.comboCountDecoration.dispose();
                this.comboCountDecoration = null;
            }
            if (this.comboTimerDecoration) {
                this.comboTimerDecoration.dispose();
                this.comboTimerDecoration = null;
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
            this.config.enableEditorComboCounter = config.get('enableEditorComboCounter', false);
            if (this.config.enableEditorComboCounter) {
                this.enabled = true;
                this.activate();
            }
            else {
                this.enabled = false;
                this.dispose();
            }
        };
        this.removeDecorations = () => {
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
            if (!firstVisibleRange || this.combo <= 1) {
                this.dispose();
                return;
            }
            const position = firstVisibleRange.start;
            const ranges = [new vscode.Range(position, position)];
            if (this.combo !== this.renderedComboCount) {
                this.renderedComboCount = this.combo;
                this.createComboCountDecoration(this.combo, ranges, editor);
                this.createComboTimerDecoration(ranges, editor);
            }
        };
        this.getSharedStyles = (comboCount, frameCount = 0) => {
            // Because the size and color do not start to change until Power Mode starts, we cannot use the raw "count" to calculate those values
            // or else there will be a large jump when powermode activates, so instead use the value relative to the combo at which Power Mode started.
            const powerModeCombo = this.isPowermodeActive ? comboCount - this.initialPowermodeCombo : 0;
            const baseTextSize = 6;
            const styleCount = Math.min(powerModeCombo, 50);
            // TODO: Explain how this formula works
            const textSize = this.isPowermodeActive ? ((styleCount * baseTextSize) / 100 * Math.pow(0.5, frameCount * 0.2) + baseTextSize) : baseTextSize;
            // Only change color in power mode
            const color = `hsl(${(100 - (this.isPowermodeActive ? powerModeCombo : 0) * 1.2)}, 100%, 45%)`;
            return { textSize: `${textSize}em`, color };
        };
        this.createComboCountDecoration = (count, ranges, editor = vscode.window.activeTextEditor) => {
            const animateComboCountDecoration = (frameCount) => {
                var _a;
                (_a = this.comboCountDecoration) === null || _a === void 0 ? void 0 : _a.dispose();
                const { textSize, color } = this.getSharedStyles(count, frameCount);
                const baseCss = ComboMeter.objectToCssString({
                    ["font-size"]: textSize,
                    ["text-shadow"]: `0px 0px 15px ${color}`,
                });
                const lightThemeCss = ComboMeter.objectToCssString({
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
                            textDecoration: `none; ${ComboMeter.DEFAULT_CSS} ${baseCss} ${lightTheme ? lightThemeCss : ""}`,
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
            clearTimeout(this.comboCountAnimationTimer);
            animateComboCountDecoration(0);
        };
        this.activate();
    }
    createComboTimerDecoration(ranges, editor = vscode.window.activeTextEditor) {
        clearTimeout(this.comboTimerDecorationTimer);
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
            const baseCss = ComboMeter.objectToCssString({
                ["font-size"]: textSize,
                ["box-shadow"]: `0px 0px 15px ${color}`,
            });
            const lightThemeCss = ComboMeter.objectToCssString({
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
                        textDecoration: `none; ${ComboMeter.DEFAULT_CSS} ${baseCss} ${lightTheme ? lightThemeCss : ""}`,
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
exports.ComboMeter = ComboMeter;
ComboMeter.DEFAULT_CSS = ComboMeter.objectToCssString({
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
//# sourceMappingURL=combo-meter.js.map