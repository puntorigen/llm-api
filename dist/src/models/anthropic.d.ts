import Anthropic from '@anthropic-ai/sdk';
import { AnthropicConfig, ChatRequestMessage, ModelConfig, ModelRequestOptions, ChatResponse } from '../types';
import { CompletionApi } from './interface';
import { getTikTokenTokensFromPrompt } from './tokenizer';
export declare class AnthropicChatApi implements CompletionApi {
    client: Anthropic;
    modelConfig: ModelConfig;
    constructor(config?: AnthropicConfig, modelConfig?: ModelConfig);
    getTokensFromPrompt: typeof getTikTokenTokensFromPrompt;
    chatCompletion(initialMessages: ChatRequestMessage[], requestOptions?: ModelRequestOptions | undefined): Promise<ChatResponse>;
    textCompletion(prompt: string, requestOptions?: Partial<ModelRequestOptions>): Promise<ChatResponse>;
}
//# sourceMappingURL=anthropic.d.ts.map