"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnthropicBedrockChatApi = void 0;
const sdk_1 = require("@anthropic-ai/sdk");
const client_bedrock_runtime_1 = require("@aws-sdk/client-bedrock-runtime");
const lodash_1 = require("lodash");
const config_1 = require("../config");
const utils_1 = require("../utils");
const errors_1 = require("./errors");
const tokenizer_1 = require("./tokenizer");
const ForbiddenTokens = [sdk_1.HUMAN_PROMPT.trim(), sdk_1.AI_PROMPT.trim()];
const RequestDefaults = {
    retries: config_1.CompletionDefaultRetries,
    timeout: config_1.CompletionDefaultTimeout,
    minimumResponseTokens: config_1.MinimumResponseTokens,
    maximumResponseTokens: config_1.MaximumResponseTokens,
};
class AnthropicBedrockChatApi {
    modelConfig;
    client;
    constructor(config, modelConfig) {
        this.modelConfig = modelConfig ?? {};
        this.client = new client_bedrock_runtime_1.BedrockRuntime({
            region: 'us-east-1',
            serviceId: 'bedrock-runtime',
            credentials: config,
            maxAttempts: RequestDefaults.retries,
        });
    }
    async chatCompletion(initialMessages, requestOptions) {
        const finalRequestOptions = (0, lodash_1.defaults)(requestOptions, RequestDefaults);
        const messages = buildMessages(finalRequestOptions, initialMessages);
        const prompt = buildPrompt(messages, finalRequestOptions);
        const maxPromptTokens = this.modelConfig.contextSize
            ? this.modelConfig.contextSize - finalRequestOptions.minimumResponseTokens
            : 100_000;
        const messageTokens = this.getTokensFromPrompt([prompt]);
        if (messageTokens > maxPromptTokens) {
            throw new errors_1.TokenError('Prompt too big, not enough tokens to meet minimum response', messageTokens - maxPromptTokens);
        }
        const params = {
            modelId: this.modelConfig.model || 'anthropic.claude-v2',
            contentType: 'application/json',
            accept: '*/*',
            body: JSON.stringify({
                prompt,
                max_tokens_to_sample: finalRequestOptions.maximumResponseTokens,
                temperature: this.modelConfig.temperature,
                top_p: this.modelConfig.topP || 1,
                stop_sequences: typeof finalRequestOptions.stop === 'string'
                    ? [finalRequestOptions.stop]
                    : finalRequestOptions.stop,
                anthropic_version: 'bedrock-2023-05-31',
            }),
        };
        let completion = '';
        const options = {
            requestTimeout: finalRequestOptions.timeout,
        };
        if (this.modelConfig.stream) {
            try {
                const result = await this.client.invokeModelWithResponseStream(params, options);
                if (finalRequestOptions?.responsePrefix) {
                    finalRequestOptions?.events?.emit('data', finalRequestOptions.responsePrefix);
                }
                const events = result.body;
                for await (const event of events || []) {
                    if (event.chunk) {
                        const decoded = JSON.parse(new TextDecoder().decode(event.chunk.bytes));
                        const text = decoded['completion'];
                        utils_1.debug.write(text);
                        completion += text;
                        finalRequestOptions?.events?.emit('data', text);
                    }
                    else {
                        throw new Error('Stream error', event.internalServerException ||
                            event.modelStreamErrorException ||
                            event.modelTimeoutException ||
                            event.throttlingException ||
                            event.validationException);
                    }
                }
                utils_1.debug.write('\n[STREAM] response end\n');
            }
            catch (err) {
                console.error(err);
            }
        }
        else {
            const command = new client_bedrock_runtime_1.InvokeModelCommand(params);
            const response = await this.client.send(command, options);
            const decoded = JSON.parse(new TextDecoder().decode(response.body));
            completion = decoded['completion'];
            utils_1.debug.log('🔽 completion received', completion);
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
                ...messages,
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
    getTokensFromPrompt = tokenizer_1.getTikTokenTokensFromPrompt;
}
exports.AnthropicBedrockChatApi = AnthropicBedrockChatApi;
function buildMessages(finalRequestOptions, initialMessages) {
    const messages = (finalRequestOptions.systemMessage
        ? [
            {
                role: 'system',
                content: typeof finalRequestOptions.systemMessage === 'string'
                    ? finalRequestOptions.systemMessage
                    : finalRequestOptions.systemMessage(),
            },
            ...initialMessages,
        ]
        : initialMessages).map((message) => ({
        ...message,
        content: message.content &&
            ForbiddenTokens.reduce((prev, token) => prev.replaceAll(token, ''), message.content),
    }));
    return messages;
}
function buildPrompt(messages, finalRequestOptions) {
    return (messages
        .map((message) => {
        switch (message.role) {
            case 'user':
                return `${sdk_1.HUMAN_PROMPT} ${message.content}`;
            case 'assistant':
                return `${sdk_1.AI_PROMPT} ${message.content}`;
            case 'system':
                return message.content;
            default:
                throw new Error(`Anthropic models do not support message with the role ${message.role}`);
        }
    })
        .join('') +
        sdk_1.AI_PROMPT +
        (finalRequestOptions.responsePrefix
            ? ` ${finalRequestOptions.responsePrefix}`
            : ''));
}
