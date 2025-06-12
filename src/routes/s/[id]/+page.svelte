<script lang="ts">
    import {
        GripVertical,
        Settings,
        Download,
        Monitor,
        Tablet,
        Smartphone,
    } from "@lucide/svelte";
    import { onMount } from "svelte";
    import { page } from "$app/stores";
    import {
        projectStorage,
        chatEventStorage,
        settingsStorage,
        apiKeyStorageKey,
    } from "$lib/storage";
    import type {
        ChatEvent,
        UserChatEvent,
        BotChatEvent,
        ThinkingChatEvent,
        ServerChatEvent,
        Project,
    } from "$lib/types.js";
    import Header from "$lib/components/Header.svelte";
    import Footer from "$lib/components/Footer.svelte";
    import OptimizeButton from "$lib/components/OptimizeButton.svelte";
    import {
        createInitialPage,
        generateChatTitle,
        refinePage,
    } from "$lib/apis/openrouter";
    import ChatLayout from "$lib/components/chat/ChatLayout.svelte";

    // Original resizing state
    let leftPanelWidth = $state(70);
    let isResizing = $state(false);
    let containerRef: HTMLDivElement | undefined = $state();

    // Chat state
    let messages: ChatEvent[] = $state([]);
    let messageInput = $state("");
    let isLoading = $state(false);
    let messagesContainer: HTMLElement | undefined = $state();
    let generatedHtml = $state(
        "<!-- Start by typing a command to create your page. -->",
    );
    let lastBotRawMessageContent: string | null = $state(null);
    let currentProject: Project | undefined = $state(undefined);
    let iframeSizeMode = $state<"desktop" | "tablet" | "mobile">("desktop");
    let hasOptimizedMessage = $state(false);

    const projectId = $page.params.id;
    const userId = "user-1";

    const iframeViewportClasses = $derived(() => {
        const transition = "transition-all duration-300 ease-in-out";
        let baseClasses = "h-full"; // Ensures viewport tries to fill height

        if (iframeSizeMode === "tablet") {
            return `${baseClasses} w-[768px] bg-zinc-700 p-3 rounded-lg shadow-lg ${transition}`;
        }
        if (iframeSizeMode === "mobile") {
            return `${baseClasses} w-[375px] bg-zinc-700 p-2 rounded-lg shadow-lg ${transition}`; // Changed to rounded-lg
        }
        // Desktop mode
        return `${baseClasses} w-full ${transition}`;
    });

    // Original resizing functions
    function startResize(e: MouseEvent) {
        isResizing = true;
        document.addEventListener("mousemove", handleResize);
        document.addEventListener("mouseup", stopResize);
        e.preventDefault();
    }

    function handleResize(e: MouseEvent) {
        if (!isResizing || !containerRef) return;

        const containerRect = containerRef.getBoundingClientRect();
        const newWidth =
            ((e.clientX - containerRect.left) / containerRect.width) * 100;

        // Constrain between 30% and 85%
        leftPanelWidth = Math.min(Math.max(newWidth, 30), 85);
    }

    function stopResize() {
        isResizing = false;
        document.removeEventListener("mousemove", handleResize);
        document.removeEventListener("mouseup", stopResize);
    }

    // Chat functions
    function generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    async function storeAndAddUserMessage(
        content: string,
        prefix: string = "",
    ): Promise<void> {
        const userMessage: UserChatEvent = {
            id: generateId(),
            type: "user",
            userId,
            content: prefix ? `${prefix}: ${content}` : content,
            timestamp: new Date(),
            projectId: projectId,
            isSent: true, // Mark as sent since it will be processed immediately
        };
        messages = [...messages, userMessage];
        try {
            await chatEventStorage.store(userMessage, projectId);
        } catch (error) {
            console.error("Failed to store user message:", error);
            // Optionally, add a server message indicating storage failure
        }
    }

    function addThinkingMessage(): string {
        const thinkingMessage: ThinkingChatEvent = {
            id: generateId(),
            type: "thinking",
            timestamp: new Date(),
        };
        messages = [...messages, thinkingMessage];
        return thinkingMessage.id;
    }

    function extractAndCleanBotResponse(rawContent: string): {
        html: string | null;
        displayText: string;
        originalMessage: string;
    } {
        const originalMessage = rawContent;

        // Look for HTML document structure
        const htmlStartRegex = /<!doctype\s+html[^>]*>|<html[^>]*>/i;
        const htmlEndRegex = /<\/html\s*>/i;

        const htmlStartMatch = rawContent.match(htmlStartRegex);
        const htmlEndMatch = rawContent.match(htmlEndRegex);

        if (htmlStartMatch && htmlEndMatch) {
            const htmlStartIndex = htmlStartMatch.index!;
            const htmlEndIndex = htmlEndMatch.index! + htmlEndMatch[0].length;

            // Extract the HTML content
            const htmlContent = rawContent.substring(
                htmlStartIndex,
                htmlEndIndex,
            );

            // Extract the text before and after HTML
            const beforeHtml = rawContent.substring(0, htmlStartIndex).trim();
            const afterHtml = rawContent.substring(htmlEndIndex).trim();

            // Combine non-HTML parts as display message
            let displayText = [beforeHtml, afterHtml]
                .filter((text) => text.length > 0)
                .join("\n\n");

            // If no display text, provide a default message
            if (!displayText) {
                displayText = "Preview updated. What's next?";
            }

            return {
                html: htmlContent,
                displayText,
                originalMessage,
            };
        }

        // If no HTML found, treat entire content as display text
        return {
            html: null,
            displayText: rawContent,
            originalMessage,
        };
    }

    async function storeAndReplaceThinkingWithBotMessage(
        thinkingId: string,
        rawBotContent: string,
        isRefinement: boolean = false,
    ): Promise<void> {
        lastBotRawMessageContent = rawBotContent;

        // Parse the bot response to separate HTML and display message
        const { html, displayText, originalMessage } =
            extractAndCleanBotResponse(rawBotContent);

        // Use the extracted display text or provide a default
        const finalDisplayText =
            displayText ||
            (isRefinement
                ? "Preview refined. Any further instructions?"
                : "Page created/updated. What's next?");

        const botMessage: BotChatEvent = {
            id: generateId(),
            type: "bot",
            content: finalDisplayText,
            rawContent: rawBotContent,
            htmlContent: html || undefined,
            originalMessage,
            timestamp: new Date(),
            projectId: projectId,
        };

        // Update the preview with HTML content if available
        if (html) {
            generatedHtml = html;
        }

        messages = messages.map((msg) =>
            msg.id === thinkingId ? botMessage : msg,
        );

        try {
            await chatEventStorage.store(botMessage, projectId);
            if (currentProject?.id && html) {
                await projectStorage.update(currentProject.id, {
                    htmlContent: html,
                });
            }
        } catch (error) {
            console.error(
                "Failed to store bot message or update project:",
                error,
            );
            addServerMessage("Error: Could not save changes.");
        }
    }

    function addServerMessage(content: string): void {
        const serverMessage: ServerChatEvent = {
            id: generateId(),
            type: "server",
            content,
            timestamp: new Date(),
        };
        messages = [...messages, serverMessage];
    }

    function scrollToBottom(): void {
        if (messagesContainer) {
            setTimeout(() => {
                if (messagesContainer) { // Double check after timeout
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }
            }, 10);
        }
    }

    async function handleSendMessage(): Promise<void> {
        if (!messageInput.trim() || isLoading) return;
        if (!(await checkApiKey())) return;

        const userMessageContent = messageInput.trim();
        messageInput = "";

        await storeAndAddUserMessage(userMessageContent);
        scrollToBottom();

        isLoading = true;
        const thinkingId = addThinkingMessage();
        scrollToBottom();

        try {
            let newHtmlContent: string;

            // Determine if we should create a new page or refine existing content
            const hasExistingContent =
                generatedHtml &&
                generatedHtml.trim() !==
                    "<!-- Start by typing a command to create your page. -->" &&
                generatedHtml.trim() !== "";

            if (hasExistingContent) {
                // If there's existing HTML content, refine it
                newHtmlContent = await refinePage(
                    generatedHtml,
                    userMessageContent,
                );
                await storeAndReplaceThinkingWithBotMessage(
                    thinkingId,
                    newHtmlContent,
                    true,
                );
            } else {
                // If no existing content, create a new page
                newHtmlContent = await createInitialPage(userMessageContent);
                await storeAndReplaceThinkingWithBotMessage(
                    thinkingId,
                    newHtmlContent,
                    false,
                );
            }
        } catch (error: any) {
            messages = messages.filter((msg) => msg.id !== thinkingId);
            const errorMsg =
                error.message || "Failed to process request. Please try again.";
            addServerMessage(`Error: ${errorMsg}`);
            console.error("API request error:", error);
        } finally {
            isLoading = false;
            scrollToBottom();
        }
    }

    async function handleRefine(): Promise<void> {
        if (!messageInput.trim() || isLoading || !generatedHtml) return;
        if (!(await checkApiKey())) return;

        const refineInstruction = messageInput.trim();
        messageInput = "";
        isLoading = true;

        await storeAndAddUserMessage(refineInstruction, "Refine");
        scrollToBottom();

        const thinkingId = addThinkingMessage();
        scrollToBottom();

        try {
            // Call client-side API for refining content
            const refinedHtmlContent = await refinePage(
                generatedHtml,
                refineInstruction,
            );

            await storeAndReplaceThinkingWithBotMessage(
                thinkingId,
                refinedHtmlContent,
                true,
            );
        } catch (error: any) {
            messages = messages.filter((msg) => msg.id !== thinkingId);
            const errorMsg =
                error.message || "Failed to refine page. Please try again.";
            addServerMessage(`Error refining: ${errorMsg}`);
            console.error("Refine page error:", error);
        } finally {
            isLoading = false;
            scrollToBottom();
        }
    }

    function handleKeyPress(event: KeyboardEvent): void {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            handleSendMessage();
        }
    }

    function formatTime(timestamp: Date): string {
        return timestamp.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    // Remove project, currentHtmlContent, userRequest state variables as they are covered by currentProject and generatedHtml
    // let project = $state<Project | null>(null); // Covered by currentProject
    // let currentHtmlContent = $state(""); // Covered by generatedHtml
    // let userRequest = $state(""); // Covered by messageInput for chat
    let errorMessage = $state(""); // Keep for API key errors or general page errors
    let showApiKeyModal = $state(false);

    async function checkApiKey() {
        const storedKey =
            await settingsStorage.getSetting<string>(apiKeyStorageKey);
        if (!storedKey) {
            // Option 1: Redirect to API key page
            // await goto('/ask-for-api-key');
            // Option 2: Show a modal or message on this page
            showApiKeyModal = true;
            errorMessage =
                "OpenRouter API Key is not set. Please configure it in settings.";
            return false;
        }
        showApiKeyModal = false;
        errorMessage = "";
        return true;
    }

    async function triggerInitialPageGeneration(initialPromptContent: string) {
        if (isLoading) return;
        isLoading = true;
        const thinkingId = addThinkingMessage();
        scrollToBottom();

        try {
            addServerMessage(
                "Auto-generating initial page based on your prompt...",
            );
            scrollToBottom();
            const newHtmlContent =
                await createInitialPage(initialPromptContent);
            await storeAndReplaceThinkingWithBotMessage(
                thinkingId,
                newHtmlContent,
                false,
            );
        } catch (error: any) {
            messages = messages.filter((msg) => msg.id !== thinkingId);
            const errorMsg =
                error.message ||
                "Failed to auto-generate initial page. Please try again.";
            addServerMessage(`Error: ${errorMsg}`);
            console.error("Auto-generate initial page error:", error);
        } finally {
            isLoading = false;
            scrollToBottom();
        }
    }

    async function markUserMessageAsSent(messageId: string): Promise<void> {
        try {
            await chatEventStorage.update(messageId, { isSent: true });
            // Update local messages array
            messages = messages.map((msg) =>
                msg.id === messageId && msg.type === "user"
                    ? { ...msg, isSent: true }
                    : msg,
            );
        } catch (error) {
            console.error("Failed to mark message as sent:", error);
        }
    }

    // Use generatedHtml for iframeSrcDoc directly
    let iframeSrcDoc = $derived(generatedHtml);

    function handleDownloadHtml() {
        if (
            !generatedHtml ||
            generatedHtml.trim() ===
                "<!-- Start by typing a command to create your page. -->" ||
            generatedHtml.trim() === ""
        ) {
            addServerMessage(
                "Nothing to download. Generate some content first.",
            );
            return;
        }
        const blob = new Blob([generatedHtml], { type: "text/html" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "index.html";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        addServerMessage("HTML content downloaded as index.html");
    }

    onMount(async () => {
        if (!(await checkApiKey())) {
            // API key not present, modal shown by checkApiKey
        }

        const loadedProject = await projectStorage.get(projectId);
        if (loadedProject) {
            currentProject = loadedProject;
            generatedHtml =
                loadedProject.htmlContent ||
                "<!-- Start by typing a command to create your page. -->";
        } else {
            errorMessage =
                "Project not found. You can start a new one by typing a description.";
            // Potentially redirect or allow creation if it's a truly new ID not yet in DB
            // For now, we assume MainPageInput creates the project entry first.
        }

        // Load chat history for the project
        const loadedMessages = await chatEventStorage.getByProject(projectId);
        messages = loadedMessages;

        // Check for unsent user messages and process them
        const unsentUserMessages = messages.filter(
            (msg) => msg.type === "user" && !(msg as UserChatEvent).isSent,
        ) as UserChatEvent[];

        if (unsentUserMessages.length > 0 && (await checkApiKey())) {
            // Process the first unsent message (usually the initial prompt)
            const firstUnsentMessage = unsentUserMessages[0];
            await markUserMessageAsSent(firstUnsentMessage.id);
            await triggerInitialPageGeneration(firstUnsentMessage.content);
            const generatedTitle = await generateChatTitle(
                firstUnsentMessage.content,
            );
            if (currentProject) {
                currentProject.name = generatedTitle;
                await projectStorage.update(currentProject.id, {
                    name: generatedTitle,
                });
            }
        } else if (
            currentProject?.htmlContent &&
            currentProject.htmlContent !==
                "<!-- Start by typing a command to create your page. -->"
        ) {
            // If there's existing HTML content in the project, ensure the preview reflects it,
            // especially if chat history might have a more recent bot message with HTML.
            const lastBotMessageWithHtml = messages
                .slice()
                .reverse()
                .find(
                    (msg) =>
                        msg.type === "bot" && (msg as BotChatEvent).htmlContent,
                ) as BotChatEvent | undefined;

            if (lastBotMessageWithHtml?.htmlContent) {
                generatedHtml = lastBotMessageWithHtml.htmlContent;
            } else {
                generatedHtml = currentProject.htmlContent;
            }
        }

        scrollToBottom();
    });

    const setIframeSize = (size: "desktop" | "tablet" | "mobile") => {
        iframeSizeMode = size;
    };

    const iframeContainerClasses = $derived(() => {
        if (iframeSizeMode === "tablet")
            return "w-[768px] mx-auto transition-all duration-300 ease-in-out";
        if (iframeSizeMode === "mobile")
            return "w-[375px] mx-auto transition-all duration-300 ease-in-out";
        return "w-full transition-all duration-300 ease-in-out"; // desktop or default
    });
</script>

<svelte:head>
    <title>{currentProject ? currentProject.name : "inja.online"}</title>
</svelte:head>

<div class="flex flex-col h-screen bg-zinc-900 text-white">
    {#if showApiKeyModal}
        <div class="p-4 bg-red-700 text-center">
            {errorMessage}
            <a href="/ask-for-api-key" class="underline hover:text-zinc-300">
                Set API Key
            </a>
        </div>
    {/if}

    <!-- Header -->
    <Header project={currentProject} />

    <!-- Main Content Layout -->
    <div class="flex flex-1 overflow-hidden" bind:this={containerRef}>
        <!-- Main Content Pane (Left) -->
        <div
            class="bg-dark-secondary border-r border-primary-accent flex flex-col"
            style="width: {leftPanelWidth}%"
        >
            <div
                class="p-2 px-4 border-b border-primary-accent flex justify-between items-center"
            >
                <span class="text-white font-medium">Preview</span>
                <div class="flex items-center space-x-1.5">
                    <button
                        onclick={() => setIframeSize("desktop")}
                        class={"p-1.5 rounded-md transition-colors duration-200 " +
                            (iframeSizeMode === "desktop"
                                ? "bg-zinc-700 text-white"
                                : "text-zinc-400 hover:bg-zinc-700 hover:text-white")}
                        title="Desktop view (Full width)"
                    >
                        <Monitor size={18} />
                    </button>
                    <button
                        onclick={() => setIframeSize("tablet")}
                        class={"p-1.5 rounded-md transition-colors duration-200 " +
                            (iframeSizeMode === "tablet"
                                ? "bg-zinc-700 text-white"
                                : "text-zinc-400 hover:bg-zinc-700 hover:text-white")}
                        title="Tablet view (768px)"
                    >
                        <Tablet size={18} />
                    </button>
                    <button
                        onclick={() => setIframeSize("mobile")}
                        class={"p-1.5 rounded-md transition-colors duration-200 " +
                            (iframeSizeMode === "mobile"
                                ? "bg-zinc-700 text-white"
                                : "text-zinc-400 hover:bg-zinc-700 hover:text-white")}
                        title="Mobile view (375px)"
                    >
                        <Smartphone size={18} />
                    </button>
                    <div class="h-5 border-l border-zinc-700 mx-1"></div>
                    <button
                        onclick={handleDownloadHtml}
                        disabled={!generatedHtml ||
                            generatedHtml.includes("Start by typing")}
                        class="text-zinc-400 hover:text-white disabled:text-zinc-600 disabled:cursor-not-allowed transition-colors duration-200 p-1.5 rounded-md"
                        title={!generatedHtml ||
                        generatedHtml.includes("Start by typing")
                            ? "Generate content to enable download"
                            : "Download HTML"}
                    >
                        <Download size={18} />
                    </button>
                </div>
            </div>

            <!-- Iframe Container -->
            <div
                class="flex-1 bg-zinc-800 m-4 border border-primary-accent rounded-md overflow-hidden flex flex-col"
            >
                <!-- Sized Viewport (conditionally gray background, specific width for tablet/mobile) -->
                <div class="{iframeViewportClasses} flex-grow">
                    <!-- Actual Page Content Wrapper (always white background) -->
                    <div class="h-full bg-white {
                        iframeSizeMode === 'tablet' ? 'rounded-md' : 
                        iframeSizeMode === 'mobile' ? 'rounded-lg' : 
                        'rounded-sm' 
                    } shadow-xl overflow-hidden"
                        class:w-[768px]={iframeSizeMode === 'tablet'}
                        class:w-[375px]={iframeSizeMode === 'mobile'}
                        class:w-full={iframeSizeMode === 'desktop'}
                        class:mx-auto={iframeSizeMode !== 'desktop'}
                        style="height: 100%;"
                    >
                        {#if generatedHtml && generatedHtml.trim() !== "<!-- Start by typing a command to create your page. -->" && generatedHtml.trim() !== ""}
                            {#key iframeSizeMode}
                                <iframe
                                    srcdoc={iframeSrcDoc}
                                    class="w-full h-full border-0"
                                    title="Generated HTML Preview"
                                    sandbox="allow-scripts allow-same-origin"
                                ></iframe>
                            {/key}
                        {:else}
                            <!-- Placeholder content also needs to be inside the white wrapper -->
                            <div class="flex items-center justify-center h-full">
                                <span class="text-zinc-500">
                                    {generatedHtml.includes("Start by typing")
                                        ? "Start by typing a command to create your page."
                                        : "No preview available. Generate content via chat."}
                                </span>
                            </div>
                        {/if}
                    </div>
                </div>
            </div>

            <!-- Attribution -->
            <Footer />
        </div>

        <!-- Resize Handle -->
        <button
            type="button"
            aria-label="Resize panels"
            class="w-1 bg-primary-accent hover:bg-secondary-accent cursor-col-resize flex items-center justify-center group focus:outline-none"
            class:bg-secondary-accent={isResizing}
            onmousedown={startResize}
        >
            <GripVertical
                class="w-3 h-6 text-dark-primary group-hover:text-dark-secondary transition-colors"
            />
        </button>

        <!-- Chat Sidebar (Right) -->
        <div class="flex-1 flex flex-col">
            <!-- Header -->
            <header
                class="border-b border-zinc-800 p-2 px-4 flex items-center justify-between"
            >
                <div class="flex items-center space-x-2">
                    <h1 class="text-md font-semibold text-zinc-100">
                        {currentProject
                            ? currentProject.name
                            : `Chat ${projectId}`}
                    </h1>
                </div>
            </header>

            <!-- Messages Container -->
            <div bind:this={messagesContainer} class="chat-section">
                <ChatLayout events={messages} />
            </div>

            <!-- Input Area -->
            <div class="border-t border-zinc-800 p-4">
                <div class="flex space-x-3">
                    <div class="relative flex-1">
                        <textarea
                            bind:value={messageInput}
                            onkeypress={handleKeyPress}
                            disabled={isLoading}
                            placeholder={isLoading
                                ? "Processing..."
                                : "Type your message or command..."}
                            class="w-full p-3 pr-10 bg-zinc-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none scrollbar-thin scrollbar-thumb-zinc-600 scrollbar-track-zinc-700"
                            rows="3"
                        ></textarea>
                        <div class="absolute top-2 right-2">
                            <OptimizeButton
                                text={messageInput}
                                contextText={currentProject?.description}
                                onOptimized={(optimizedText) => {
                                    messageInput = optimizedText;
                                    hasOptimizedMessage = true; // Optionally track if optimization was used
                                }}
                            />
                        </div>
                    </div>
                    <button
                        onclick={handleSendMessage}
                        disabled={isLoading || !messageInput.trim()}
                        class="bg-blue-600 text-white rounded-lg px-4 py-2 transition-all duration-200 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {#if isLoading}
                            <svg
                                class="animate-spin h-5 w-5 mr-3 -ml-1 text-white inline-block"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    class="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    stroke-width="4"
                                ></circle>
                                <path
                                    class="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                ></path>
                            </svg>
                        {/if}
                        {#if !isLoading}
                            <span>Send</span>
                        {/if}
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>

<style>
    .chat-section {
        flex-grow: 1;
        overflow-y: auto;
    }

    /* Removed iframe-preview-wrapper and related styles as they are now handled by iframeViewportClasses and Tailwind */
    .iframe-content,
    .placeholder-content {
        /* These might still be useful if you have specific styling for the content itself, 
           but general layout is now Tailwind-driven */
        background-color: white; /* Ensure content background is white */
        border: none;
        border-radius: 0.125rem; /* rounded-sm for the inner white box */
    }

    .placeholder-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 2.5rem; /* p-10 */
        color: initial; 
    }
</style>
