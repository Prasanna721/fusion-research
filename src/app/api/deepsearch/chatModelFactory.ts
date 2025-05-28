import { ChatAnthropic } from '@langchain/anthropic';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatOpenAI } from '@langchain/openai';
// import { ChatGroq } from "@langchain/groq";

export enum ModelProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GROQ = 'groq',
}

export const SUPPORTED_MODELS = {
  [ModelProvider.OPENAI]: {
    gpt4o: 'gpt-4o',
  },
  [ModelProvider.ANTHROPIC]: {
    sonnet_3_5: 'claude-3-5-sonnet-20240620',
  },
};

export function initChatModel(
  modelIdentifier: string,
  modelKwargs?: Record<string, any>
): BaseChatModel {
  const [provider, modelName] = modelIdentifier.split(':');
  if (!modelName) {
    if (!provider) throw new Error('Model identifier must be provided.');
    return new ChatOpenAI({ modelName: provider, ...modelKwargs });
  }

  switch (provider.toLowerCase()) {
    case ModelProvider.OPENAI:
      return new ChatOpenAI({ modelName, ...modelKwargs });
    case ModelProvider.ANTHROPIC:
      return new ChatAnthropic({ modelName, ...modelKwargs });
    // case ModelProvider.GROQ:
    //   return new ChatGroq({ modelName, ...modelKwargs });
    default:
      console.warn(
        `Unsupported provider: ${provider}. Defaulting to OpenAI with model name ${modelIdentifier}.`
      );
      return new ChatOpenAI({ modelName: modelIdentifier, ...modelKwargs });
  }
}
