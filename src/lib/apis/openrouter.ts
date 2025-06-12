import { settingsStorage } from "$lib/storage";
import {
  getSystemPrompt,
  getInitialPrompt,
  getRefinementPrompt,
  REFINE_SYSTEM_PROMPT,
  GET_TITLE_PROMPT,
  OPTIMIZE_PROMPT_SYSTEM,
} from "./prompts";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const API_KEY_STORAGE_KEY = "openrouter_api_key";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
  }>;
  // Add other fields if necessary, like 'id', 'model', 'usage', etc.
}

export interface Model {
  id: string;
  name: string;
  description: string;
  context_length: number;
  // Add other relevant fields from the OpenRouter /models endpoint
}

export interface ModelsResponse {
  data: Model[];
}

async function getApiKey(): Promise<string> {
  const apiKey = await settingsStorage.getSetting<string>(API_KEY_STORAGE_KEY);
  if (!apiKey) {
    throw new Error(
      "OpenRouter API key not found. Please set it in the application settings.",
    );
  }
  return apiKey;
}

export function extractHtmlContent(content: string): string {
  let result = content;
  if (result.startsWith("```html")) {
    result = result.slice(7);
  }
  if (result.endsWith("```")) {
    result = result.slice(0, -3);
  }
  return result.trim();
}

export async function callOpenRouterApi(
  messages: ChatMessage[],
  model: string = "qwen/qwen3-32b", // Default model
): Promise<string> {
  const apiKey = await getApiKey();

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  const body = {
    model: model,
    provider: {
      // Specify provider if needed, or remove if model implies it
      only: ["Cerebras"],
    },
    messages,
  };

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("OpenRouter API error response:", errorBody);
      throw new Error(
        `HTTP error! status: ${response.status}, message: ${errorBody}`,
      );
    }

    const data: ChatCompletionResponse = await response.json();

    if (
      data.choices &&
      data.choices.length > 0 &&
      data.choices[0].message.content
    ) {
      return data.choices[0].message.content;
    } else {
      throw new Error("No content in OpenRouter API response");
    }
  } catch (error) {
    console.error("Error calling OpenRouter API:", error);
    throw error; // Re-throw to be handled by the caller
  }
}

export async function createInitialPage(userPrompt: string): Promise<string> {
  const messages: ChatMessage[] = [
    { role: "system", content: getSystemPrompt() },
    { role: "user", content: getInitialPrompt(userPrompt) },
  ];
  const rawContent = await callOpenRouterApi(messages);
  return extractHtmlContent(rawContent);
}

export async function generateChatTitle(userPrompt: string): Promise<string> {
  const messages: ChatMessage[] = [
    { role: "system", content: GET_TITLE_PROMPT(userPrompt) },
    { role: "user", content: userPrompt },
  ];
  const rawContent = await callOpenRouterApi(messages);
  // The title prompt is designed to return just the title, no HTML or markdown.
  // So we can return the raw content directly after trimming.
  return rawContent.trim();
}

export async function refinePage(
  originalHtml: string,
  userRequest: string,
): Promise<string> {
  const messages: ChatMessage[] = [
    { role: "system", content: REFINE_SYSTEM_PROMPT },
    { role: "user", content: getRefinementPrompt(originalHtml, userRequest) },
  ];
  const rawContent = await callOpenRouterApi(messages);
  return extractHtmlContent(rawContent);
}


export async function checkConnectionAndListModels(apiKeyOverride?: string): Promise<Model[]> {
  const apiKey = apiKeyOverride || await getApiKey();
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  try {
    // Attempt to filter by provider directly in the API call
    const response = await fetch("https://openrouter.ai/api/v1/models?provider=anthropic", {
      method: "GET",
      headers
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("OpenRouter API error response (models):", errorBody);
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const parsedError = JSON.parse(errorBody);
        if (parsedError.error && parsedError.error.message) {
          errorMessage += `, message: ${parsedError.error.message}`;
        } else {
          errorMessage += `, message: ${errorBody}`;
        }
      } catch (e) {
        errorMessage += `, message: ${errorBody}`;
      }
      throw new Error(errorMessage);
    }

    const data: ModelsResponse = await response.json();
    
    if (data.data && Array.isArray(data.data)) {
      return data.data;
    } else {
      throw new Error("No model data in OpenRouter API response or unexpected format");
    }
  } catch (error) {
    console.error("Error fetching models from OpenRouter API:", error);
    throw error; // Re-throw to be handled by the caller
  }
}

export async function optimizePrompt(userPrompt: string, contextPrompt?: string): Promise<string> {
  const messages: ChatMessage[] = [
    { role: "system", content: OPTIMIZE_PROMPT_SYSTEM },
  ];

  if (contextPrompt && contextPrompt.trim()) {
    messages.push({ role: "user", content: `Original project idea for context: "${contextPrompt.trim()}"` });
    messages.push({ role: "user", content: `Refine this specific part: "${userPrompt.trim()}"` });
  } else {
    messages.push({ role: "user", content: userPrompt.trim() });
  }
  
  const rawContent = await callOpenRouterApi(messages, "meta-llama/llama-3.1-8b-instruct"); // Using a generally good model for this
  return rawContent.trim();
}
