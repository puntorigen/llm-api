"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnthropicChatApi = void 0;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const lodash_1 = require("lodash");
const config_1 = require("../config");
const utils_1 = require("../utils");
const errors_1 = require("./errors");
const tokenizer_1 = require("./tokenizer");
const RequestDefaults = {
    retries: config_1.CompletionDefaultRetries,
    timeout: config_1.CompletionDefaultTimeout,
    minimumResponseTokens: config_1.MinimumResponseTokens,
    maximumResponseTokens: config_1.MaximumResponseTokens,
};
class AnthropicChatApi {
    client;
    modelConfig;
    constructor(config, modelConfig) {
        this.client = new sdk_1.default(config);
        this.modelConfig = modelConfig ?? {};
    }
    getTokensFromPrompt = tokenizer_1.getTikTokenTokensFromPrompt;
    async chatCompletion(initialMessages, requestOptions) {
        const finalRequestOptions = (0, lodash_1.defaults)(requestOptions, RequestDefaults);
        const messages = (0, lodash_1.compact)([
            ...initialMessages,
            finalRequestOptions.responsePrefix
                ? {
                    role: 'assistant',
                    content: finalRequestOptions.responsePrefix,
                }
                : null,
        ]);
        utils_1.debug.log(`🔼 completion requested: ${JSON.stringify(messages)}, config: ${JSON.stringify(this.modelConfig)}, options: ${JSON.stringify(finalRequestOptions)}`);
        const maxPromptTokens = this.modelConfig.contextSize
            ? this.modelConfig.contextSize - finalRequestOptions.minimumResponseTokens
            : 100_000;
        const messageTokens = this.getTokensFromPrompt(messages.map((m) => m.content ?? ''));
        if (messageTokens > maxPromptTokens) {
            throw new errors_1.TokenError('Prompt too big, not enough tokens to meet minimum response', messageTokens - maxPromptTokens);
        }
        let completion = '';
        const completionBody = {
            stop_sequences: typeof finalRequestOptions.stop === 'string'
                ? [finalRequestOptions.stop]
                : finalRequestOptions.stop,
            temperature: this.modelConfig.temperature,
            top_p: this.modelConfig.topP,
            model: this.modelConfig.model ?? config_1.DefaultAnthropicModel,
            max_tokens: finalRequestOptions.maximumResponseTokens,
            system: finalRequestOptions.systemMessage
                ? typeof finalRequestOptions.systemMessage === 'string'
                    ? finalRequestOptions.systemMessage
                    : finalRequestOptions.systemMessage()
                : undefined,
            messages: messages
                .filter((m) => (m.role === 'user' || m.role === 'assistant') && m.content)
                .map((m) => ({
                role: m.role,
                content: m.content ?? '',
            })),
        };
        const completionOptions = {
            timeout: finalRequestOptions.timeout,
            maxRetries: finalRequestOptions.retries,
        };
        if (this.modelConfig.stream) {
            const stream = await this.client.messages.stream(completionBody, completionOptions);
            if (finalRequestOptions?.responsePrefix) {
                finalRequestOptions?.events?.emit('data', finalRequestOptions.responsePrefix);
            }
            for await (const part of stream) {
                if (part.type === 'content_block_start' &&
                    part.content_block.type === 'text' &&
                    part.index === 0) {
                    const text = part.content_block.text;
                    utils_1.debug.write(text);
                    completion += text;
                    finalRequestOptions?.events?.emit('data', text);
                }
                else if (part.type === 'content_block_delta' &&
                    part.delta.type === 'text_delta' &&
                    part.index === 0) {
                    const text = part.delta.text;
                    utils_1.debug.write(text);
                    completion += text;
                    finalRequestOptions?.events?.emit('data', text);
                }
            }
            utils_1.debug.write('\n[STREAM] response end\n');
        }
        else {
            const response = await this.client.messages.create(completionBody, completionOptions);
            if ('content' in response) {
                completion = response.content[0].text;
                utils_1.debug.log('🔽 completion received', completion);
            }
        }
        const content = finalRequestOptions.responsePrefix
            ? finalRequestOptions.responsePrefix + completion
            :
                completion.trim();
        if (!content) {
            throw new Error('Completion response malformed');
        }
        const receivedMessage = {
            role: 'assistant',
            content,
        };
        return {
            message: receivedMessage,
            content,
            respond: (message, opt) => this.chatCompletion([
                ...initialMessages,
                receivedMessage,
                typeof message === 'string'
                    ? { role: 'user', content: message }
                    : message,
            ], opt ?? requestOptions),
        };
    }
    textCompletion(prompt, requestOptions = {}) {
        const messages = [{ role: 'user', content: prompt }];
        return this.chatCompletion(messages, requestOptions);
    }
}
exports.AnthropicChatApi = AnthropicChatApi;
