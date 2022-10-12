"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateConfig = exports.isConfigSet = exports.getDeprecatedConfigValue = exports.getConfigValue = exports.CSS_TOP = exports.CSS_LEFT = void 0;
const vscode_1 = require("vscode");
exports.CSS_LEFT = "margin-left";
exports.CSS_TOP = "top";
function getConfigValue(key, vscodeConfig, themeConfig = {}) {
    return getConfigValueCore(key, vscodeConfig, themeConfig);
}
exports.getConfigValue = getConfigValue;
function getDeprecatedConfigValue(key, vscodeConfig, themeConfig = {}) {
    return getConfigValueCore(key, vscodeConfig, themeConfig);
}
exports.getDeprecatedConfigValue = getDeprecatedConfigValue;
function getConfigValueCore(key, vscodeConfig, themeConfig = {}) {
    // If the config is explicitly set, use that value
    if (isConfigSet(key, vscodeConfig)) {
        return vscodeConfig.get(key);
    }
    // Use the themeConfig value if set,
    const themeValue = themeConfig[key];
    if (!isNullOrUndefined(themeValue)) {
        return themeValue;
    }
    // Fall back to the package.json default value
    // as a last resort
    return vscodeConfig.get(key);
}
function isConfigSet(key, config) {
    const inspectionResults = config.inspect(key);
    if (!isNullOrUndefined(inspectionResults.workspaceFolderValue)) {
        return vscode_1.ConfigurationTarget.WorkspaceFolder;
    }
    else if (!isNullOrUndefined(inspectionResults.workspaceValue)) {
        return vscode_1.ConfigurationTarget.Workspace;
    }
    else if (!isNullOrUndefined(inspectionResults.globalValue)) {
        return vscode_1.ConfigurationTarget.Global;
    }
    else {
        return false;
    }
}
exports.isConfigSet = isConfigSet;
function updateConfig(key, value, config) {
    const target = isConfigSet(key, config) || vscode_1.ConfigurationTarget.Global;
    config.update(key, value, target);
}
exports.updateConfig = updateConfig;
function isNullOrUndefined(value) {
    return value === null || value === undefined;
}
//# sourceMappingURL=config.js.map