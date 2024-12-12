"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTikTokenTokensFromPrompt = getTikTokenTokensFromPrompt;
const js_tiktoken_1 = __importDefault(require("js-tiktoken"));
const encoder = js_tiktoken_1.default.getEncoding('cl100k_base');
function getTikTokenTokensFromPrompt(promptOrMessages, functions) {
    let numTokens = 0;
    for (const message of promptOrMessages) {
        numTokens += 5;
        numTokens += encoder.encode(message).length;
    }
    numTokens += 2;
    if (functions) {
        for (const func of functions) {
            numTokens += 5;
            numTokens += encoder.encode(JSON.stringify(func)).length;
        }
        numTokens += 20;
    }
    return numTokens;
}
