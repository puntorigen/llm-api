import { ClientOptions as AnthropicClientOptions } from '@anthropic-ai/sdk';
import EventEmitter from 'events';
import { ClientOptions as GroqClientOptions } from 'groq-sdk';
import { ClientOptions as OpenAIClientOptions } from 'openai';
import { JsonValue } from 'type-fest';
export type GroqConfig = GroqClientOptions;
export type AnthropicConfig = AnthropicClientOptions;
export type OpenAIConfig = OpenAIClientOptions & {
    azureEndpoint?: string;
    azureDeployment?: string;
    azureApiVersion?: string;
};
export interface ModelConfig {
    model?: string;
    contextSize?: number;
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    presencePenalty?: number;
    frequencyPenalty?: number;
    logitBias?: Record<string, number>;
    user?: string;
    stream?: boolean;
}
export type ModelFunction = {
    name: string;
    parameters: {
        [key: string]: any;
    };
    description?: string;
};
export type ModelRequestOptions = {
    systemMessage?: string | (() => string);
    responsePrefix?: string;
    stop?: string | string[];
    functions?: ModelFunction[];
    callFunction?: string;
    retries?: number;
    retryInterval?: number;
    timeout?: number;
    minimumResponseTokens?: number;
    maximumResponseTokens?: number;
    events?: EventEmitter;
};
export type ChatRequestRole = 'system' | 'user' | 'assistant' | 'tool';
export interface ChatRequestMessage {
    role: ChatRequestRole;
    content?: string;
    toolCall?: ChatRequestToolCall;
    toolCallId?: string;
}
export interface ChatRequestToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
}
export type ChatResponse = {
    message: ChatRequestMessage;
    content?: string;
    toolCallId?: string;
    name?: string;
    arguments?: JsonValue;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    respond: (message: string | ChatRequestMessage, opt?: ModelRequestOptions) => Promise<ChatResponse>;
};
//# sourceMappingURL=types.d.ts.map