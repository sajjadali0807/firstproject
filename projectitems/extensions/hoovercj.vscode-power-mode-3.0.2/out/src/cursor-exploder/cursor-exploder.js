"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CursorExploder = void 0;
const vscode = require("vscode");
const config_1 = require("../config/config");
class CursorExploder {
    constructor(themeConfig) {
        this.themeConfig = themeConfig;
        this.config = {};
        this.activeDecorations = [];
        this.keystrokeCounter = -1;
        this.explosionIndex = -1;
        this.onThemeChanged = (theme) => {
            this.themeConfig = theme;
            this.initialize();
        };
        this.activate = () => {
            this.initialize();
        };
        this.dispose = () => {
            this.onPowermodeStop();
        };
        this.onPowermodeStart = (combo) => {
            // Do nothing
        };
        this.onPowermodeStop = (combo) => {
            // Dispose all explosions
            while (this.activeDecorations.length > 0) {
                this.activeDecorations.shift().dispose();
            }
        };
        this.onComboStop = (finalCombo) => {
            // Handled by onPowermodeStop
        };
        this.onDidChangeTextDocument = (data, event) => {
            if (!this.config["explosions.enable"] || !data.isPowermodeActive) {
                return;
            }
            // If the content change is empty then it was likely a delete
            // This means there may not be text after the cursor, so do the
            // explosion before instead.
            const changes = event.contentChanges[0];
            const left = changes && changes.text.length === 0;
            this.explode(data.activeEditor, left);
        };
        this.onDidChangeConfiguration = (config) => {
            const newConfig = {
                "explosions.customExplosions": (0, config_1.getConfigValue)('explosions.customExplosions', config, this.themeConfig),
                "explosions.enable": (0, config_1.getConfigValue)('explosions.enabled', config, this.themeConfig),
                "explosions.maxExplosions": (0, config_1.getConfigValue)('explosions.maxExplosions', config, this.themeConfig),
                "explosions.size": (0, config_1.getConfigValue)('explosions.size', config, this.themeConfig),
                "explosions.frequency": (0, config_1.getConfigValue)('explosions.frequency', config, this.themeConfig),
                "explosions.offset": (0, config_1.getConfigValue)('explosions.offset', config, this.themeConfig),
                "explosions.explosionOrder": (0, config_1.getConfigValue)('explosions.explosionOrder', config, this.themeConfig),
                "explosions.duration": (0, config_1.getConfigValue)('explosions.duration', config, this.themeConfig),
                "explosions.backgroundMode": (0, config_1.getConfigValue)('explosions.backgroundMode', config, this.themeConfig),
                "explosions.gifMode": (0, config_1.getConfigValue)('explosions.gifMode', config, this.themeConfig),
                "explosions.customCss": (0, config_1.getConfigValue)('explosions.customCss', config, this.themeConfig),
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
            this.config = newConfig;
            this.initialize();
        };
        this.initialize = () => {
            this.dispose();
            if (!this.config["explosions.enable"]) {
                return;
            }
            this.explosionIndex = -1;
            this.keystrokeCounter = -1;
        };
        this.getExplosionDecoration = (position) => {
            let explosions = this.config["explosions.customExplosions"];
            const explosion = this.pickExplosion(explosions);
            if (!explosion) {
                return null;
            }
            return this.createExplosionDecorationType(explosion, position);
        };
        /**
         * @returns an decoration type with the configured background image
         */
        this.createExplosionDecorationType = (explosion, editorPosition) => {
            // subtract 1 ch to account for the character and divide by two to make it centered
            // Use Math.floor to skew to the right which especially helps when deleting chars
            const leftValue = Math.floor((this.config["explosions.size"] - 1) / 2);
            // By default, the top of the gif will be at the top of the text.
            // Setting the top to a negative value will raise it up.
            // The default gifs are "tall" and the bottom halves are empty.
            // Lowering them makes them appear in a more natural position,
            // but limiting the top to the line number keeps it from going
            // off the top of the editor
            const topValue = this.config["explosions.size"] * this.config["explosions.offset"];
            const explosionUrl = this.getExplosionUrl(explosion);
            const backgroundCss = this.config["explosions.backgroundMode"] === 'mask' ?
                this.getMaskCssSettings(explosionUrl) :
                this.getBackgroundCssSettings(explosionUrl);
            const defaultCss = {
                position: 'absolute',
                [config_1.CSS_LEFT]: `-${leftValue}ch`,
                [config_1.CSS_TOP]: `-${topValue}rem`,
                width: `${this.config["explosions.size"]}ch`,
                height: `${this.config["explosions.size"]}rem`,
                display: `inline-block`,
                ['z-index']: 1,
                ['pointer-events']: 'none',
            };
            const backgroundCssString = this.objectToCssString(backgroundCss);
            const defaultCssString = this.objectToCssString(defaultCss);
            const customCssString = this.objectToCssString(this.config["explosions.customCss"] || {});
            return vscode.window.createTextEditorDecorationType({
                before: {
                    contentText: '',
                    textDecoration: `none; ${defaultCssString} ${backgroundCssString} ${customCssString}`,
                },
                textDecoration: `none; position: relative;`,
                rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
            });
        };
        /**
         * "Explodes" where the cursor is by setting a text decoration
         * that contains a base64 encoded gif as the background image.
         * The gif is then removed 1 second later
         *
         * @param {boolean} [left=false] place the decoration to
         * the left or the right of the cursor
         */
        this.explode = (editor, left = false) => {
            // To give the explosions space, only explode every X strokes
            // Where X is the configured explosion frequency
            // This counter resets if the user does not type for 1 second.
            clearTimeout(this.counterTimeout);
            this.counterTimeout = setTimeout(() => {
                this.keystrokeCounter = -1;
            }, 1000);
            if (++this.keystrokeCounter % this.config["explosions.frequency"] !== 0) {
                return;
            }
            const cursorPosition = editor.selection.active;
            // The delta is greater to the left than to the right because otherwise the gif doesn't appear
            const delta = left ? -2 : 1;
            const newRange = new vscode.Range(cursorPosition.with(cursorPosition.line, cursorPosition.character), 
            // Value can't be negative
            cursorPosition.with(cursorPosition.line, Math.max(0, cursorPosition.character + delta)));
            // Dispose excess explosions
            while (this.activeDecorations.length >= this.config["explosions.maxExplosions"]) {
                this.activeDecorations.shift().dispose();
            }
            // A new decoration is used each time because otherwise adjacent
            // gifs will all be identical. This helps them be at least a little
            // offset.
            const decoration = this.getExplosionDecoration(newRange.start);
            if (!decoration) {
                return;
            }
            this.activeDecorations.push(decoration);
            if (this.config["explosions.duration"] !== 0) {
                setTimeout(() => {
                    decoration.dispose();
                }, this.config["explosions.duration"]);
            }
            editor.setDecorations(decoration, [newRange]);
        };
    }
    pickExplosion(explosions) {
        if (!explosions) {
            return null;
        }
        switch (typeof this.config["explosions.explosionOrder"]) {
            case 'string':
                switch (this.config["explosions.explosionOrder"]) {
                    case 'random':
                        this.explosionIndex = getRandomInt(0, explosions.length);
                        break;
                    case 'sequential':
                        this.explosionIndex = (this.explosionIndex + 1) % explosions.length;
                        break;
                    default:
                        this.explosionIndex = 0;
                }
                break;
            case 'number':
                this.explosionIndex = Math.min(explosions.length - 1, Math.floor(Math.abs(this.config["explosions.explosionOrder"])));
            default:
                break;
        }
        return explosions[this.explosionIndex];
    }
    getExplosionUrl(explosion) {
        if (this.config["explosions.gifMode"] !== 'restart') {
            return explosion;
        }
        if (this.isUrl(explosion)) {
            return `${explosion}?timestamp=${Date.now()}`;
        }
        else {
            // https://tools.ietf.org/html/rfc2397
            return explosion.replace('base64,', `timestamp=${Date.now()};base64,`);
        }
    }
    isUrl(value) {
        return value.indexOf('https') === 0;
    }
    getBackgroundCssSettings(explosion) {
        return {
            'background-repeat': 'no-repeat',
            'background-size': 'contain',
            'background-image': `url("${explosion}")`,
        };
    }
    getMaskCssSettings(explosion) {
        return {
            'background-color': 'currentColor',
            '-webkit-mask-repeat': 'no-repeat',
            '-webkit-mask-size': 'contain',
            '-webkit-mask-image': `url("${explosion}")`,
            filter: 'saturate(150%)',
        };
    }
    objectToCssString(settings) {
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
exports.CursorExploder = CursorExploder;
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}
//# sourceMappingURL=cursor-exploder.js.map