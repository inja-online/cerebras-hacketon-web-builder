<script lang="ts">
    import { goto } from "$app/navigation";
    import { projectStorage, chatEventStorage } from "$lib/storage";
    import type { UserChatEvent } from "$lib/types";
    import { Send } from "@lucide/svelte";

    let prompt = "";
    const userId = "user-1"; // Consistent with project page

    function generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    async function handleSubmit() {
        if (!prompt.trim()) return;

        try {
            const projectName = `Project - ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
            const projectDescription = prompt.trim();

            const newProjectId = await projectStorage.store({
                name: projectName,
                description: projectDescription,
                htmlContent:
                    "<!-- Start by typing a command to create your page. -->", // Initialize htmlContent
                isPrivate: false,
            });

            // Create and store the initial user message as a chat event
            const initialUserMessage: UserChatEvent = {
                id: generateId(),
                type: "user",
                userId,
                content: projectDescription, // Use the same prompt content
                timestamp: new Date(),
                projectId: newProjectId,
                isSent: false, // Mark as not sent so it gets processed on page load
            };
            await chatEventStorage.store(initialUserMessage, newProjectId);

            // Navigate to the new project's page
            goto(`/s/${newProjectId}`);
        } catch (error) {
            console.error("Failed to create new project:", error);
            // Optionally, show an error message to the user
        }
    }

    async function handleKeydown(event: KeyboardEvent) {
        if (event.ctrlKey && event.key === "Enter") {
            event.preventDefault(); // Prevent default Enter behavior (newline)
            await handleSubmit();
        }
    }
</script>

<div class="space-y-4">
    <textarea
        bind:value={prompt}
        placeholder="Describe your idea..."
        class="w-full h-24 bg-dark-secondary border border-primary-accent/20 rounded-lg p-4 text-white placeholder-text-muted resize-none focus:outline-none focus:border-primary-accent/40 transition-colors duration-200"
        onkeydown={handleKeydown}
    ></textarea>

    <div class="flex justify-end">
        <button class="button" onclick={handleSubmit} disabled={!prompt.trim()}>
            <div class="dots_border"></div>
            <Send size={20} class="mr-2" />
            <span class="text_button">Build (Ctrl+Enter)</span>
        </button>
    </div>
</div>
