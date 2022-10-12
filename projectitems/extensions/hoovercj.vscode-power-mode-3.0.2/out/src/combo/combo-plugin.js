"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComboPlugin = void 0;
const config_1 = require("../config/config");
const editor_combo_meter_1 = require("./editor-combo-meter");
const status_bar_combo_meter_1 = require("./status-bar/status-bar-combo-meter");
const status_bar_timer_1 = require("./status-bar/status-bar-timer");
class ComboPlugin {
    constructor() {
        this.plugins = [];
        this.onDidChangeConfiguration = (config) => {
            var _a, _b;
            const oldLocation = (_b = (_a = this.config) === null || _a === void 0 ? void 0 : _a.comboLocation) !== null && _b !== void 0 ? _b : "off";
            this.config = {
                comboLocation: comboLocationConfigToComboLocation((0, config_1.getConfigValue)("combo.location", config)),
                enableComboTimer: comboFeatureConfigToBoolean((0, config_1.getConfigValue)("combo.timerEnabled", config)),
                enableComboCounter: comboFeatureConfigToBoolean((0, config_1.getConfigValue)("combo.counterEnabled", config)),
                comboCounterSize: (0, config_1.getConfigValue)("combo.counterSize", config),
            };
            if (this.config.comboLocation !== oldLocation) {
                this.dispose();
                switch (this.config.comboLocation) {
                    case 'editor':
                        this.plugins.push(new editor_combo_meter_1.EditorComboMeter());
                        break;
                    case 'statusbar':
                        this.plugins.push(new status_bar_combo_meter_1.StatusBarComboMeter(), new status_bar_timer_1.StatusBarTimer());
                        break;
                }
            }
            this.plugins.forEach(plugin => plugin.onDidChangeConfiguration(this.config));
        };
    }
    dispose() {
        while (this.plugins.length > 0) {
            this.plugins.shift().dispose();
        }
    }
    onPowermodeStart(combo) {
        this.plugins.forEach(plugin => plugin.onPowermodeStart(combo));
    }
    onPowermodeStop(combo) {
        this.plugins.forEach(plugin => plugin.onPowermodeStop(combo));
    }
    onComboStop(finalCombo) {
        this.plugins.forEach(plugin => plugin.onComboStop(finalCombo));
    }
    onDidChangeTextDocument(data, event) {
        this.plugins.forEach(plugin => plugin.onDidChangeTextDocument(data, event));
    }
}
exports.ComboPlugin = ComboPlugin;
const comboLocationConfigToComboLocation = (configLocation) => {
    // TODO: Add support for "default" to read a value from a preset
    switch (configLocation) {
        case 'editor':
        case 'off':
        case 'statusbar':
            return configLocation;
        case 'default':
        default:
            return 'editor';
    }
};
const comboFeatureConfigToBoolean = (value) => {
    // TODO: Add support for "default" to read a value from a preset
    switch (value) {
        case 'hide':
            return false;
        case 'default':
        case 'show':
        default:
            return true;
    }
};
//# sourceMappingURL=combo-plugin.js.map