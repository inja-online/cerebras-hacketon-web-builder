import type { ChatRequest, ChatResponse } from './types.js';

export interface ApiResponse {
	success: boolean;
	content?: string;
	rawContent?: string; // To store the full response from the bot if needed
	error?: string;
}

// Renamed from sendChatMessage and updated for the /api/create endpoint
export async function sendCreateRequest(
	chatHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<ApiResponse> {
	try {
		const response = await fetch('/api/create', { // Updated endpoint
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ chatHistory }) // Send the constructed chat history
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({ error: 'Network response was not ok and failed to parse error JSON.' }));
			return { success: false, error: errorData.error || `HTTP error! status: ${response.status}` };
		}

		const data = await response.json();
		// Assuming the create API returns 'content' for HTML and 'rawContent' for the full message
		return { success: true, content: data.content, rawContent: data.rawContent };
	} catch (error) {
		console.error('Error sending create request:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return { success: false, error: `Failed to send create request: ${errorMessage}` };
	}
}

export async function sendRefineRequest(originalHtml: string, userRequest: string): Promise<ApiResponse> {
    try {
        const response = await fetch('/api/refine', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ originalHtml, userRequest })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Network response was not ok and failed to parse error JSON.' }));
            return { success: false, error: errorData.error || `HTTP error! status: ${response.status}` };
        }

        const data = await response.json();
        return { success: true, content: data.content };
    } catch (error) {
        console.error('Error sending refine request:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: `Failed to send refine request: ${errorMessage}` };
    }
}
