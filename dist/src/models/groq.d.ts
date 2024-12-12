import { Groq } from 'groq-sdk';
import { ChatRequestMessage, ModelConfig, ModelRequestOptions, ChatResponse, GroqConfig } from '../types';
import { CompletionApi } from './interface';
import { getTikTokenTokensFromPrompt } from './tokenizer';
export declare class GroqChatApi implements CompletionApi {
    client: Groq;
    modelConfig: ModelConfig;
    constructor(config?: GroqConfig, modelConfig?: ModelConfig);
    getTokensFromPrompt: typeof getTikTokenTokensFromPrompt;
    chatCompletion(initialMessages: ChatRequestMessage[], requestOptions?: ModelRequestOptions | undefined): Promise<ChatResponse>;
    textCompletion(prompt: string, requestOptions?: Partial<ModelRequestOptions>): Promise<ChatResponse>;
}
//# sourceMappingURL=groq.d.ts.map