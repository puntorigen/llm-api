"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockOpenAIChatApi = void 0;
class MockOpenAIChatApi {
    config;
    modelConfig;
    chatMessages = [];
    chatOpt = [];
    textPrompt = [];
    textOpt = [];
    promptOrMessages = [];
    checkProfanityMessage = [];
    expectedArgs = {};
    setExpectedArgs(args) {
        this.expectedArgs = args;
    }
    validateArgs() {
        for (const method in this.expectedArgs) {
            expect(this[method]).toEqual(this.expectedArgs[method]);
        }
    }
    constructor(config, modelConfig = { model: 'default' }) {
        this.config = config;
        this.modelConfig = modelConfig;
    }
    async chatCompletion(messages, opt) {
        this.chatMessages.push(messages);
        if (opt) {
            this.chatOpt.push(opt);
        }
        return Promise.resolve({
            message: {
                role: 'assistant',
                content: 'Test Content, this is a chat completion',
            },
            content: 'Test Content, this is a chat completion',
            name: 'TestName',
            arguments: {},
            usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
            respond: async () => this.chatCompletion(messages, opt),
        });
    }
    async textCompletion(prompt, opt) {
        this.textPrompt.push(prompt);
        if (opt) {
            this.textOpt.push(opt);
        }
        return Promise.resolve({
            message: {
                role: 'assistant',
                content: 'Test Content, this is a text completion',
            },
            content: 'Test Content, this is a text completion',
            name: 'TestName',
            arguments: {},
            usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
            respond: async () => this.textCompletion(prompt, opt),
        });
    }
    getTokensFromPrompt(promptOrMessages) {
        this.promptOrMessages.push(promptOrMessages);
        return -1;
    }
}
exports.MockOpenAIChatApi = MockOpenAIChatApi;
