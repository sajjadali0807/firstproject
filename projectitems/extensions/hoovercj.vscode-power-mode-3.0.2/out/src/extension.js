"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const config_1 = require("./config/config");
const particles_1 = require("./config/particles");
const fireworks_1 = require("./config/fireworks");
const flames_1 = require("./config/flames");
const magic_1 = require("./config/magic");
const clippy_1 = require("./config/clippy");
const rift_1 = require("./config/rift");
const screen_shaker_1 = require("./screen-shaker/screen-shaker");
const cursor_exploder_1 = require("./cursor-exploder/cursor-exploder");
const combo_plugin_1 = require("./combo/combo-plugin");
const configuration_migrator_1 = require("./config/configuration-migrator");
// Config values
let enabled = false;
let comboThreshold;
let comboTimeout;
let comboTimeoutHandle;
// Native plugins
let screenShaker;
let cursorExploder;
let comboPlugin;
// PowerMode components
let plugins = [];
let documentChangeListenerDisposer;
// Themes
let themes = {
    fireworks: fireworks_1.Fireworks,
    particles: particles_1.Particles,
    flames: flames_1.Flames,
    magic: magic_1.Magic,
    clippy: clippy_1.Clippy,
    ["simple-rift"]: rift_1.SimpleRift,
    ["exploding-rift"]: rift_1.ExplodingRift,
};
// Current combo count
let combo = 0;
let isPowermodeActive = false;
function activate(context) {
    // Try to migrate any existing configuration files
    (0, configuration_migrator_1.migrateConfiguration)();
    const enableCommand = 'powermode.enablePowerMode';
    const disableCommand = 'powermode.disablePowerMode';
    const setEnabled = (value) => {
        const config = vscode.workspace.getConfiguration("powermode");
        (0, config_1.updateConfig)("enabled", value, config);
    };
    // Register enable/disable commands
    context.subscriptions.push(vscode.commands.registerCommand(enableCommand, () => setEnabled(true)));
    context.subscriptions.push(vscode.commands.registerCommand(disableCommand, () => setEnabled(false)));
    // Subscribe to configuration changes
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(onDidChangeConfiguration));
    // Initialize from the current configuration
    onDidChangeConfiguration();
}
exports.activate = activate;
function init(config, activeTheme) {
    // Just in case something was left behind, clean it up
    resetState();
    // The native plugins need this special theme, a subset of the config
    screenShaker = new screen_shaker_1.ScreenShaker(activeTheme),
        cursorExploder = new cursor_exploder_1.CursorExploder(activeTheme),
        comboPlugin = new combo_plugin_1.ComboPlugin();
    plugins.push(screenShaker, cursorExploder, comboPlugin);
    plugins.forEach(plugin => plugin.onDidChangeConfiguration(config));
    documentChangeListenerDisposer = vscode.workspace.onDidChangeTextDocument(onDidChangeTextDocument);
}
/**
 * Note: this method is also called automatically
 * when the extension is deactivated
 */
function deactivate() {
    resetState();
}
exports.deactivate = deactivate;
function resetState() {
    combo = 0;
    stopTimer();
    documentChangeListenerDisposer === null || documentChangeListenerDisposer === void 0 ? void 0 : documentChangeListenerDisposer.dispose();
    while (plugins.length > 0) {
        plugins.shift().dispose();
    }
}
function onDidChangeConfiguration() {
    const config = vscode.workspace.getConfiguration('powermode');
    const themeId = (0, config_1.getConfigValue)("presets", config);
    const theme = getThemeConfig(themeId);
    const oldEnabled = enabled;
    enabled = (0, config_1.getConfigValue)('enabled', config);
    comboThreshold = (0, config_1.getConfigValue)('combo.threshold', config);
    comboTimeout = (0, config_1.getConfigValue)('combo.timeout', config);
    // Switching from disabled to enabled
    if (!oldEnabled && enabled) {
        init(config, theme);
        return;
    }
    // Switching from enabled to disabled
    if (oldEnabled && !enabled) {
        resetState();
        return;
    }
    // If not enabled, nothing matters
    // because it will be taken care of
    // when it gets reenabled
    if (!enabled) {
        return;
    }
    // The theme needs set BEFORE onDidChangeConfiguration is called
    screenShaker.themeConfig = theme;
    cursorExploder.themeConfig = theme;
    plugins.forEach(plugin => plugin.onDidChangeConfiguration(config));
}
// This will be exposed so other extensions can contribute their own themes
// function registerTheme(themeId: string, config: ThemeConfig) {
//     themes[themeId] = config;
// }
function getThemeConfig(themeId) {
    return themes[themeId];
}
const onComboTimerExpired = () => {
    plugins.forEach(plugin => plugin.onPowermodeStop(combo));
    plugins.forEach(plugin => plugin.onComboStop(combo));
    combo = 0;
};
function isPowerMode() {
    return enabled && combo >= comboThreshold;
}
function onDidChangeTextDocument(event) {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
        return;
    }
    combo++;
    const powermode = isPowerMode();
    startTimer();
    if (powermode != isPowermodeActive) {
        isPowermodeActive = powermode;
        isPowermodeActive ?
            plugins.forEach(plugin => plugin.onPowermodeStart(combo)) :
            plugins.forEach(plugin => plugin.onPowermodeStop(combo));
    }
    plugins.forEach(plugin => plugin.onDidChangeTextDocument({
        isPowermodeActive,
        comboTimeout,
        currentCombo: combo,
        activeEditor,
    }, event));
}
/**
 * Starts a "progress" in the bottom of the vscode window
 * which displays the time remaining for the current combo
 */
function startTimer() {
    stopTimer();
    if (comboTimeout === 0) {
        return;
    }
    comboTimeoutHandle = setTimeout(onComboTimerExpired, comboTimeout * 1000);
}
function stopTimer() {
    clearInterval(comboTimeoutHandle);
    comboTimeoutHandle = null;
}
//# sourceMappingURL=extension.js.map