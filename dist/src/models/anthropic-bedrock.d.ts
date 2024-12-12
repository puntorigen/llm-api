import { BedrockRuntime, BedrockRuntimeClientConfig } from '@aws-sdk/client-bedrock-runtime';
import { ChatRequestMessage, ChatResponse, ModelConfig, ModelRequestOptions } from '../types';
import { CompletionApi } from './interface';
import { getTikTokenTokensFromPrompt } from './tokenizer';
export declare class AnthropicBedrockChatApi implements CompletionApi {
    modelConfig: ModelConfig;
    client: BedrockRuntime;
    constructor(config: BedrockRuntimeClientConfig['credentials'], modelConfig?: ModelConfig);
    chatCompletion(initialMessages: ChatRequestMessage[], requestOptions?: ModelRequestOptions | undefined): Promise<ChatResponse>;
    textCompletion(prompt: string, requestOptions?: Partial<ModelRequestOptions>): Promise<ChatResponse>;
    getTokensFromPrompt: typeof getTikTokenTokensFromPrompt;
}
//# sourceMappingURL=anthropic-bedrock.d.ts.map