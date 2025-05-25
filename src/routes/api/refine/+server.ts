import { json } from '@sveltejs/kit';
import { getRefinedHtmlCompletion, extractHtmlContent } from '$lib/server/handler/refine.server';

export async function POST({ request }) {
	try {
		const { originalHtml, userRequest } = await request.json();

		if (!originalHtml || typeof originalHtml !== 'string') {
			return json({ success: false, error: 'Missing or invalid originalHtml' }, { status: 400 });
		}
		if (!userRequest || typeof userRequest !== 'string') {
			return json({ success: false, error: 'Missing or invalid userRequest' }, { status: 400 });
		}

		const completionResponse = await getRefinedHtmlCompletion(originalHtml, userRequest);

		if (completionResponse.choices && completionResponse.choices.length > 0) {
			const refinedContent = completionResponse.choices[0].message.content;
			const htmlOnly = extractHtmlContent(refinedContent); // Ensure only HTML is sent back
			return json({ success: true, content: htmlOnly });
		} else {
			return json({ success: false, error: 'No response from AI model' }, { status: 500 });
		}
	} catch (error) {
		console.error('Refine API error:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return json({ success: false, error: `Failed to process refinement: ${errorMessage}` }, { status: 500 });
	}
}
