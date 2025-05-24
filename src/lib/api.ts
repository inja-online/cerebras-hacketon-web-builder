import type { ChatRequest, ChatResponse } from './types.js';

export async function sendChatMessage(message: string, chatId: string): Promise<ChatResponse> {
	try {
		const chatHistory = [
			{
				role: 'user' as const,
				content: message
			}
		];

		const response = await fetch('/api/chat', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				systemPrompt: 'You are a helpful assistant for web development. Provide clear, concise responses.',
				chatHistory
			})
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();
		
		if (data.success) {
			return {
				content: data.content || data.rawContent || '',
				success: true
			};
		} else {
			return {
				content: '',
				success: false,
				error: data.error || 'Unknown error occurred'
			};
		}
	} catch (error) {
		console.error('Failed to send chat message:', error);
		return {
			content: '',
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error occurred'
		};
	}
}
