import { getSystemPrompt } from '../prompts.server';

const VITE_OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface ChatCompletionResponse {
    choices: Array<{
        message: {
            content: string;
            role: string;
        };
    }>;
}

export async function getChatCompletion(
    chatHistory: ChatMessage[],
    model: string = 'meta-llama/llama-4-scout'
): Promise<ChatCompletionResponse> {
    const url = 'https://openrouter.ai/api/v1/chat/completions';

    const messages = [
        { role: 'system' as const, content: getSystemPrompt() },
        ...chatHistory
    ];

    const headers = {
        'Authorization': `Bearer ${VITE_OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
    };

    const data = {
        model,
        messages
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Chat completion error:', error);
        throw error;
    }
}

export function extractHtmlContent(content: string): string {
    let result = content;

    // Remove ```html from the beginning
    if (result.startsWith('```html')) {
        result = result.slice(7);
    }

    // Remove ``` from the end
    if (result.endsWith('```')) {
        result = result.slice(0, -3);
    }

    return result.trim();
}
