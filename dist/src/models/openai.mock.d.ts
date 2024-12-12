import type { ModelRequestOptions, ModelConfig, OpenAIConfig, ChatRequestMessage, ChatResponse } from '../types';
import type { CompletionApi } from './interface';
export declare class MockOpenAIChatApi implements CompletionApi {
    [key: string]: any;
    config: OpenAIConfig;
    modelConfig: ModelConfig;
    chatMessages: ChatRequestMessage[][];
    chatOpt: ModelRequestOptions[];
    textPrompt: string[];
    textOpt: ModelRequestOptions[];
    promptOrMessages: string[][];
    checkProfanityMessage: string[];
    expectedArgs: {
        [key: string]: any;
        constructorArgs?: {
            config: OpenAIConfig;
            modelConfig: ModelConfig;
        };
        chatCompletionArgs?: {
            messages: ChatRequestMessage[];
            opt?: ModelRequestOptions;
        }[];
        textCompletionArgs?: {
            prompt: string;
            opt?: ModelRequestOptions;
        }[];
        getTokensFromPromptArgs?: {
            promptOrMessages: string[];
        }[];
        checkProfanityArgs?: {
            message: string;
        }[];
    };
    setExpectedArgs(args: this['expectedArgs']): void;
    validateArgs(): void;
    constructor(config: OpenAIConfig, modelConfig?: ModelConfig);
    chatCompletion(messages: ChatRequestMessage[], opt?: ModelRequestOptions): Promise<ChatResponse>;
    textCompletion(prompt: string, opt?: ModelRequestOptions): Promise<ChatResponse>;
    getTokensFromPrompt(promptOrMessages: string[]): number;
}
//# sourceMappingURL=openai.mock.d.ts.map