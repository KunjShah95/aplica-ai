"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMProvider = void 0;
exports.createProvider = createProvider;
var claude_js_1 = require("./providers/claude.js");
var LLMProvider = /** @class */ (function () {
    function LLMProvider(config) {
        this.config = config;
    }
    return LLMProvider;
}());
exports.LLMProvider = LLMProvider;
function createProvider(config) {
    switch (config.provider) {
        case 'claude':
            return new claude_js_1.ClaudeProvider(config);
        default:
            throw new Error("Unsupported LLM provider: ".concat(config.provider));
    }
}
