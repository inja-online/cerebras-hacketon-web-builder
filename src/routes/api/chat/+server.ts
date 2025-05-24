import { json } from '@sveltejs/kit';
import { getChatCompletion, extractHtmlContent } from '$lib/server/handler/chat.server';

interface ChatRequest {
    systemPrompt?: string;
    systemPromptName?: string;
    chatHistory: Array<{
        role: 'user' | 'assistant';
        content: string;
    }>;
}

export const POST = async ({ request }: any) => {
    try {
        const body: ChatRequest = await request.json();

        let systemPrompt = body.systemPrompt || '';

        // If systemPromptName is provided, load from file
        if (body.systemPromptName && !systemPrompt) {
            try {
                systemPrompt = "you are helpful assistant";
            } catch (error) {
                return json(
                    { error: `Failed to load system prompt: ${body.systemPromptName}` },
                    { status: 400 }
                );
            }
        }

        if (!systemPrompt) {
            return json(
                { error: 'Either systemPrompt or systemPromptName is required' },
                { status: 400 }
            );
        }

        if (!body.chatHistory || !Array.isArray(body.chatHistory)) {
            return json(
                { error: 'chatHistory is required and must be an array' },
                { status: 400 }
            );
        }

        const completion = await getChatCompletion(systemPrompt, body.chatHistory);

        const rawContent = completion.choices?.[0]?.message?.content || '';
        const extractedContent = extractHtmlContent(rawContent);

        return json({
            success: true,
            content: extractedContent,
            rawContent,
            fullResponse: completion
        });

    } catch (error) {
        console.error('Chat API error:', error);
        return json(
            { error: 'Failed to process chat completion' },
            { status: 500 }
        );
    }
};
