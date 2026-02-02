"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function () { return this; }, i;
    function awaitReturn(f) { return function (v) { return Promise.resolve(v).then(f, reject); }; }
    function verb(n, f) { if (g[n]) { i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; if (f) i[n] = f(i[n]); } }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaudeProvider = void 0;
var sdk_1 = require("@anthropic-ai/sdk");
var index_1 = require("../index");
var ClaudeProvider = /** @class */ (function (_super) {
    __extends(ClaudeProvider, _super);
    function ClaudeProvider(config) {
        var _this = _super.call(this, config) || this;
        _this.client = new sdk_1.default({
            apiKey: config.apiKey
        });
        return _this;
    }
    ClaudeProvider.prototype.complete = function (messages, options) {
        return __awaiter(this, void 0, void 0, function () {
            var maxTokens, temperature, systemPrompt, formattedMessages, response, content;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        maxTokens = (_a = options === null || options === void 0 ? void 0 : options.maxTokens) !== null && _a !== void 0 ? _a : this.config.maxTokens;
                        temperature = (_b = options === null || options === void 0 ? void 0 : options.temperature) !== null && _b !== void 0 ? _b : this.config.temperature;
                        systemPrompt = (options === null || options === void 0 ? void 0 : options.systemPrompt) || this.config.systemPrompt;
                        formattedMessages = messages.map(function (msg) { return ({
                            role: msg.role,
                            content: msg.content
                        }); });
                        return [4 /*yield*/, this.client.messages.create({
                                model: this.config.model,
                                max_tokens: maxTokens,
                                temperature: temperature,
                                system: systemPrompt,
                                messages: formattedMessages
                            })];
                    case 1:
                        response = _c.sent();
                        content = response.content
                            .filter(function (block) { return block.type === 'text'; })
                            .map(function (block) { return block.text; })
                            .join('');
                        return [2 /*return*/, {
                                content: content,
                                tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
                                model: response.model
                            }];
                }
            });
        });
    };
    ClaudeProvider.prototype.stream = function (messages, options) {
        return __asyncGenerator(this, arguments, function stream_1() {
            var maxTokens, temperature, systemPrompt, formattedMessages, stream, _a, stream_2, stream_2_1, event_1, e_1_1;
            var _b, e_1, _c, _d;
            var _e, _f;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0:
                        maxTokens = (_e = options === null || options === void 0 ? void 0 : options.maxTokens) !== null && _e !== void 0 ? _e : this.config.maxTokens;
                        temperature = (_f = options === null || options === void 0 ? void 0 : options.temperature) !== null && _f !== void 0 ? _f : this.config.temperature;
                        systemPrompt = (options === null || options === void 0 ? void 0 : options.systemPrompt) || this.config.systemPrompt;
                        formattedMessages = messages.map(function (msg) { return ({
                            role: msg.role,
                            content: msg.content
                        }); });
                        return [4 /*yield*/, __await(this.client.messages.create({
                                model: this.config.model,
                                max_tokens: maxTokens,
                                temperature: temperature,
                                system: systemPrompt,
                                messages: formattedMessages,
                                stream: true
                            }))];
                    case 1:
                        stream = _g.sent();
                        _g.label = 2;
                    case 2:
                        _g.trys.push([2, 9, 10, 15]);
                        _a = true, stream_2 = __asyncValues(stream);
                        _g.label = 3;
                    case 3: return [4 /*yield*/, __await(stream_2.next())];
                    case 4:
                        if (!(stream_2_1 = _g.sent(), _b = stream_2_1.done, !_b)) return [3 /*break*/, 8];
                        _d = stream_2_1.value;
                        _a = false;
                        event_1 = _d;
                        if (!(event_1.type === 'content_block_delta' && event_1.delta.type === 'text_delta')) return [3 /*break*/, 7];
                        return [4 /*yield*/, __await(event_1.delta.text)];
                    case 5: return [4 /*yield*/, _g.sent()];
                    case 6:
                        _g.sent();
                        _g.label = 7;
                    case 7:
                        _a = true;
                        return [3 /*break*/, 3];
                    case 8: return [3 /*break*/, 15];
                    case 9:
                        e_1_1 = _g.sent();
                        e_1 = { error: e_1_1 };
                        return [3 /*break*/, 15];
                    case 10:
                        _g.trys.push([10, , 13, 14]);
                        if (!(!_a && !_b && (_c = stream_2.return))) return [3 /*break*/, 12];
                        return [4 /*yield*/, __await(_c.call(stream_2))];
                    case 11:
                        _g.sent();
                        _g.label = 12;
                    case 12: return [3 /*break*/, 14];
                    case 13:
                        if (e_1) throw e_1.error;
                        return [7 /*endfinally*/];
                    case 14: return [7 /*endfinally*/];
                    case 15: return [2 /*return*/];
                }
            });
        });
    };
    ClaudeProvider.prototype.isAvailable = function () {
        return !!this.config.apiKey;
    };
    return ClaudeProvider;
}(index_1.LLMProvider));
exports.ClaudeProvider = ClaudeProvider;
