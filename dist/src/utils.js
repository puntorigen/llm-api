"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.debug = void 0;
exports.sleep = sleep;
exports.parseUnsafeJson = parseUnsafeJson;
const debug_1 = require("debug");
const jsonic_1 = __importDefault(require("jsonic"));
const jsonrepair_1 = require("jsonrepair");
const error = (0, debug_1.debug)('llm-api:error');
const log = (0, debug_1.debug)('llm-api:log');
log.log = console.log.bind(console);
exports.debug = {
    error,
    log,
    write: (t) => process.env.DEBUG &&
        (process.env.DEBUG === '*' || 'llm-api:log'.match(process.env.DEBUG)) &&
        process.stdout &&
        process.stdout.write(t),
};
function sleep(delay) {
    return new Promise((resolve) => {
        setTimeout(resolve, delay);
    });
}
function parseUnsafeJson(json) {
    return (0, jsonic_1.default)((0, jsonrepair_1.jsonrepair)(json));
}
