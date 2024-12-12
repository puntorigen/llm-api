"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIChatApi = void 0;
require("openai/shims/web");
const lodash_1 = require("lodash");
const openai_1 = require("openai");
const config_1 = require("../config");
const utils_1 = require("../utils");
const errors_1 = require("./errors");
const tokenizer_1 = require("./tokenizer");
const RequestDefaults = {
    retries: config_1.CompletionDefaultRetries,
    timeout: config_1.CompletionDefaultTimeout,
    minimumResponseTokens: config_1.MinimumResponseTokens,
};
const convertConfig = (config) => ({
    model: config.model,
    temperature: config.temperature,
    top_p: config.topP,
    n: 1,
    presence_penalty: config.presencePenalty,
    frequency_penalty: config.frequencyPenalty,
    logit_bias: config.logitBias,
    user: config.user,
    stream: config.stream,
});
class OpenAIChatApi {
    client;
    _isAzure;
    _headers;
    modelConfig;
    constructor(config, modelConfig) {
        this._isAzure = Boolean(config.azureEndpoint && config.azureDeployment);
        this.client = new openai_1.OpenAI({
            ...config,
            baseURL: this._isAzure
                ? `${config.azureEndpoint}${config.azureEndpoint?.at(-1) === '/' ? '' : '/'}openai/deployments/${config.azureDeployment}`
                : config.baseURL,
            defaultHeaders: this._isAzure
                ? { 'api-key': String(config.apiKey) }
                : undefined,
            defaultQuery: this._isAzure
                ? {
                    'api-version': config.azureApiVersion ?? config_1.DefaultAzureVersion,
                }
                : undefined,
        });
        this.modelConfig = modelConfig ?? {};
    }
    getTokensFromPrompt = tokenizer_1.getTikTokenTokensFromPrompt;
    async chatCompletion(initialMessages, requestOptions = {}) {
        const finalRequestOptions = (0, lodash_1.defaults)(requestOptions, RequestDefaults);
        if (finalRequestOptions.responsePrefix) {
            console.warn('OpenAI models currently does not support responsePrefix');
        }
        const messages = finalRequestOptions.systemMessage
            ? [
                {
                    role: 'system',
                    content: typeof finalRequestOptions.systemMessage === 'string'
                        ? finalRequestOptions.systemMessage
                        : finalRequestOptions.systemMessage(),
                },
                ...initialMessages,
            ]
            : initialMessages;
        utils_1.debug.log(`🔼 completion requested: ${JSON.stringify(messages)}, config: ${JSON.stringify(this.modelConfig)}, options: ${JSON.stringify(finalRequestOptions)}`);
        const maxPromptTokens = this.modelConfig.contextSize
            ? this.modelConfig.contextSize - finalRequestOptions.minimumResponseTokens
            : 100_000;
        const messageTokens = this.getTokensFromPrompt(messages.map((m) => m.content ?? ''), finalRequestOptions.functions);
        if (messageTokens > maxPromptTokens) {
            throw new errors_1.TokenError('Prompt too big, not enough tokens to meet minimum response', messageTokens - maxPromptTokens);
        }
        const maxTokens = this.modelConfig.contextSize && finalRequestOptions.maximumResponseTokens
            ? Math.min(this.modelConfig.contextSize - maxPromptTokens, finalRequestOptions.maximumResponseTokens)
            : undefined;
        if (finalRequestOptions.maximumResponseTokens &&
            !this.modelConfig.contextSize) {
            console.warn('maximumResponseTokens option ignored, please set contextSize in ModelConfig so the parameter can be calculated safely');
        }
        let completion = '';
        let toolCall;
        let usage;
        const completionBody = {
            model: config_1.DefaultOpenAIModel,
            ...convertConfig(this.modelConfig),
            max_tokens: maxTokens,
            stop: finalRequestOptions.stop,
            tools: finalRequestOptions.functions?.map((f) => ({
                type: 'function',
                function: f,
            })),
            tool_choice: finalRequestOptions.callFunction
                ? {
                    type: 'function',
                    function: { name: finalRequestOptions.callFunction },
                }
                : finalRequestOptions.functions
                    ? 'auto'
                    : undefined,
            messages: messages.map((m) => m.role === 'assistant'
                ? {
                    role: 'assistant',
                    content: m.content ?? '',
                    tool_calls: m.toolCall ? [m.toolCall] : undefined,
                }
                : m.role === 'tool'
                    ? {
                        role: 'tool',
                        content: m.content ?? '',
                        tool_call_id: m.toolCallId ?? '',
                    }
                    : { role: m.role, content: m.content ?? '' }),
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
            const toolCallStreamParts = [];
            for await (const part of stream) {
                const text = part.choices[0]?.delta?.content;
                const call = part.choices[0]?.delta?.tool_calls?.[0];
                if (text) {
                    utils_1.debug.write(text);
                    completion += text;
                    finalRequestOptions?.events?.emit('data', text);
                }
                else if (call) {
                    utils_1.debug.write(call.function
                        ? call.function.name
                            ? `${call.function.name}: ${call.function.arguments}\n`
                            : call.function.arguments
                        : call.id ?? '');
                    toolCallStreamParts.push(call);
                }
            }
            if (toolCallStreamParts.length > 0) {
                toolCall = toolCallStreamParts.reduce((prev, part) => ({
                    id: prev.id ?? part.id,
                    type: prev.type ?? part.type,
                    function: {
                        name: (prev.function?.name ?? '') + (part.function?.name ?? ''),
                        arguments: (prev.function?.arguments ?? '') +
                            (part.function?.arguments ?? ''),
                    },
                }), {});
            }
            utils_1.debug.write('\n[STREAM] response end\n');
        }
        else {
            const response = await this.client.chat.completions.create({ ...completionBody, stream: false }, completionOptions);
            completion = response.choices[0].message.content ?? '';
            toolCall = response.choices[0].message.tool_calls?.[0];
            usage = response.usage;
            utils_1.debug.log('🔽 completion received', completion);
        }
        if (completion) {
            const receivedMessage = {
                role: 'assistant',
                content: completion,
            };
            return {
                message: receivedMessage,
                content: completion,
                respond: (message, opt) => this.chatCompletion([
                    ...messages,
                    receivedMessage,
                    typeof message === 'string'
                        ? { role: 'user', content: message }
                        : message,
                ], opt ?? requestOptions),
                usage: usage
                    ? {
                        totalTokens: usage.total_tokens,
                        promptTokens: usage.prompt_tokens,
                        completionTokens: usage.completion_tokens,
                    }
                    : undefined,
            };
        }
        else if (toolCall) {
            const receivedMessage = {
                role: 'assistant',
                content: '',
                toolCall,
            };
            return {
                message: receivedMessage,
                toolCallId: toolCall.id,
                name: toolCall.function.name,
                arguments: (0, utils_1.parseUnsafeJson)(toolCall.function.arguments),
                respond: (message, opt) => this.chatCompletion([
                    ...messages,
                    receivedMessage,
                    typeof message === 'string'
                        ? { role: 'tool', toolCallId: toolCall?.id, content: message }
                        : message,
                ], opt ?? requestOptions),
                usage: usage
                    ? {
                        totalTokens: usage.total_tokens,
                        promptTokens: usage.prompt_tokens,
                        completionTokens: usage.completion_tokens,
                    }
                    : undefined,
            };
        }
        else {
            throw new Error('Completion response malformed');
        }
    }
    async textCompletion(prompt, requestOptions = {}) {
        const messages = [{ role: 'user', content: prompt }];
        return this.chatCompletion(messages, requestOptions);
    }
}
exports.OpenAIChatApi = OpenAIChatApi;
