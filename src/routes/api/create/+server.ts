import { json } from '@sveltejs/kit';
import { getChatCompletion, extractHtmlContent } from '$lib/server/handler/chat.server';

interface CreateRequest {
	// chatHistory will contain the user's idea and any previous bot/user messages for context
	chatHistory: Array<{
		role: 'user' | 'assistant';
		content: string;
	}>;
}

export const POST = async ({ request }: any) => {
	try {
		const body: CreateRequest = await request.json();

		if (!body.chatHistory || !Array.isArray(body.chatHistory) || body.chatHistory.length === 0) {
			return json(
				{ success: false, error: 'chatHistory is required, must be a non-empty array' },
				{ status: 400 }
			);
		}

		// getChatCompletion from chat.server.ts will internally use getSystemPrompt()
		const completion = await getChatCompletion(body.chatHistory);

		const rawContent = completion.choices?.[0]?.message?.content || '';
		// Extract HTML content if applicable, or return raw if not primarily HTML focused.
		// For "create", we expect HTML.
		const extractedContent = extractHtmlContent(rawContent);

		return json({
			success: true,
			content: extractedContent, // This is the HTML content
			rawContent // This includes any text before/after HTML block from the bot
		});

	} catch (error) {
		console.error('Create API error:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return json(
			{ success: false, error: `Failed to process creation request: ${errorMessage}` },
			{ status: 500 }
		);
	}
};
