import 'openai/shims/web';
import { OpenAI } from 'openai';
import type { ModelRequestOptions, ModelConfig, OpenAIConfig, ChatRequestMessage, ChatResponse } from '../types';
import type { CompletionApi } from './interface';
import { getTikTokenTokensFromPrompt } from './tokenizer';
export declare class OpenAIChatApi implements CompletionApi {
    client: OpenAI;
    _isAzure: boolean;
    _headers?: Record<string, string>;
    modelConfig: ModelConfig;
    constructor(config: OpenAIConfig, modelConfig?: ModelConfig);
    getTokensFromPrompt: typeof getTikTokenTokensFromPrompt;
    chatCompletion(initialMessages: ChatRequestMessage[], requestOptions?: Partial<ModelRequestOptions>): Promise<ChatResponse>;
    textCompletion(prompt: string, requestOptions?: Partial<ModelRequestOptions>): Promise<ChatResponse>;
}
//# sourceMappingURL=openai.d.ts.map