"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenError = void 0;
class TokenError extends Error {
    overflowTokens;
    constructor(message, overflowTokens) {
        super(message);
        this.name = 'TokenError';
        this.overflowTokens = overflowTokens;
    }
}
exports.TokenError = TokenError;
