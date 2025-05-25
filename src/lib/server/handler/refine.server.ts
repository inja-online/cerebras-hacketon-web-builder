import { REFINE_SYSTEM_PROMPT } from '../prompts.server';
import { extractHtmlContent } from './chat.server'; // Re-use existing HTML extraction

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

export async function getRefinedHtmlCompletion(
	originalHtml: string,
	userRequest: string
): Promise<ChatCompletionResponse> {
	const url = 'https://openrouter.ai/api/v1/chat/completions';

	// Constructing the prompt for refinement
	// The user message will contain both the original HTML and the new request.
	// Alternatively, you could structure this with multiple user/assistant messages if the model handles context better that way.
	// For simplicity, we'll combine them into one user message for now.
	const combinedUserMessage = `Here is the current HTML code:
\`\`\`html
${originalHtml}
\`\`\`

Please refine it based on the following instruction: ${userRequest}`;

	const messages: ChatMessage[] = [
		{ role: 'system', content: REFINE_SYSTEM_PROMPT },
		{ role: 'user', content: combinedUserMessage }
	];

	const headers = {
		'Authorization': `Bearer ${VITE_OPENROUTER_API_KEY}`,
		'Content-Type': 'application/json'
	};

	const data = {
		model: 'qwen/qwen3-32b', // Or your preferred model for this task
		provider: {
			only: ['Cerebras']
		},
		messages
	};

	try {
		const response = await fetch(url, {
			method: 'POST',
			headers,
			body: JSON.stringify(data)
		});

		if (!response.ok) {
			const errorBody = await response.text();
			console.error(`HTTP error! status: ${response.status}`, errorBody);
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		return await response.json();
	} catch (error) {
		console.error('Refine completion error:', error);
		throw error;
	}
}

// Re-export extractHtmlContent if it's generic enough, or create a specific one if needed.
// For now, assuming the existing one works.
export { extractHtmlContent };
