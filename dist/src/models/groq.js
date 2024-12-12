"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroqChatApi = void 0;
const groq_sdk_1 = require("groq-sdk");
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
class GroqChatApi {
    client;
    modelConfig;
    constructor(config, modelConfig) {
        this.client = new groq_sdk_1.Groq(config);
        this.modelConfig = modelConfig ?? {};
    }
    getTokensFromPrompt = tokenizer_1.getTikTokenTokensFromPrompt;
    async chatCompletion(initialMessages, requestOptions) {
        const finalRequestOptions = (0, lodash_1.defaults)(requestOptions, RequestDefaults);
        const messagesWithSystem = (0, lodash_1.compact)([
            finalRequestOptions.systemMessage
                ? {
                    role: 'system',
                    content: typeof finalRequestOptions.systemMessage === 'string'
                        ? finalRequestOptions.systemMessage
                        : finalRequestOptions.systemMessage(),
                }
                : null,
            ...initialMessages,
        ]);
        const messages = (0, lodash_1.compact)([
            ...messagesWithSystem,
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
            stop: finalRequestOptions.stop,
            temperature: this.modelConfig.temperature,
            top_p: this.modelConfig.topP,
            model: this.modelConfig.model ?? config_1.DefaultGroqModel,
            max_tokens: finalRequestOptions.maximumResponseTokens,
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
            const stream = await this.client.chat.completions.create({ ...completionBody, stream: true }, completionOptions);
            if (finalRequestOptions?.responsePrefix) {
                finalRequestOptions?.events?.emit('data', finalRequestOptions.responsePrefix);
            }
            for await (const part of stream) {
                const text = part.choices[0]?.delta?.content ?? '';
                utils_1.debug.write(text);
                completion += text;
                finalRequestOptions?.events?.emit('data', text);
            }
            utils_1.debug.write('\n[STREAM] response end\n');
        }
        else {
            const response = await this.client.chat.completions.create({ ...completionBody, stream: false }, completionOptions);
            completion = response.choices[0].message.content ?? '';
            utils_1.debug.log('🔽 completion received', completion);
        }
        const content = finalRequestOptions.responsePrefix
            ? completion.startsWith(finalRequestOptions.responsePrefix)
                ? completion
                : finalRequestOptions.responsePrefix + completion
            : completion;
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
                ...messagesWithSystem,
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
exports.GroqChatApi = GroqChatApi;
