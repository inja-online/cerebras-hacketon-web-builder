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
        selectedModelKey,
        selectedProviderKey,
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
    import {
        createInitialPage,
        generateChatTitle,
        refinePage,
    } from "$lib/apis/openrouter";
    import ChatLayout from "$lib/components/chat/ChatLayout.svelte";
    import ModelSelection from "$lib/components/ModelSelection.svelte";

    // Original resizing state
    let leftPanelWidth = $state(70);
    let isResizing = $state(false);
    let containerRef;

    // Chat state
    let messages: ChatEvent[] = $state([]);
    let messageInput = $state("");
    let isLoading = $state(false);
    let messagesContainer: HTMLElement | undefined = $state();
    let generatedHtml = $state(
        "<!-- Start by typing a command to create your page. -->",
    ); // Initialize with a placeholder
    let lastBotRawMessageContent: string | null = $state(null);
    let currentProject: Project | undefined = $state(undefined);
    let iframeSizeMode = $state<"desktop" | "tablet" | "mobile">("desktop");

    let currentModel = $state("qwen/qwen3-32b"); // Default model
    let currentProvider = $state("Cerebras"); // Default provider
    // Add a new state for the API key modal message, distinct from general errorMessage
    let apiKeyErrorMessage = $state("");

    const projectId = $page.params.id;
    const userId = "user-1";

    // Original resizing functions
    function startResize(e) {
        isResizing = true;
        document.addEventListener("mousemove", handleResize);
        document.addEventListener("mouseup", stopResize);
        e.preventDefault();
    }

    function handleResize(e) {
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
            model: currentModel, // Store current model
            provider: currentProvider, // Store current provider
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
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
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

            const hasExistingContent =
                generatedHtml &&
                generatedHtml.trim() !==
                    "<!-- Start by typing a command to create your page. -->" &&
                generatedHtml.trim() !== "";

            if (hasExistingContent) {
                newHtmlContent = await refinePage(
                    generatedHtml,
                    userMessageContent,
                    currentModel,
                    currentProvider,
                );
                await storeAndReplaceThinkingWithBotMessage(
                    thinkingId,
                    newHtmlContent,
                    true,
                );
            } else {
                newHtmlContent = await createInitialPage(
                    userMessageContent,
                    currentModel,
                    currentProvider,
                );
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
                currentModel,
                currentProvider,
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
            showApiKeyModal = true;
            apiKeyErrorMessage = // Use the new state variable here
                "OpenRouter API Key is not set. Please configure it in settings.";
            return false;
        }
        showApiKeyModal = false;
        apiKeyErrorMessage = ""; // Clear message when key is found
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
            const newHtmlContent = await createInitialPage(
                initialPromptContent,
                currentModel,
                currentProvider,
            );
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

    // New handler for downloading HTML from a specific message
    function handleDownloadMessageHtml(htmlContent: string, messageId: string) {
        if (!htmlContent || htmlContent.trim() === "") {
            addServerMessage(
                `No HTML content in message ${messageId} to download.`,
            );
            return;
        }
        const blob = new Blob([htmlContent], { type: "text/html" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        // Sanitize messageId for use in filename, or use a generic name
        const safeName = currentProject?.name
            ? currentProject.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()
            : "project";
        link.download = `${safeName}-version-${messageId.substring(0, 8)}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        addServerMessage(`HTML from message downloaded as ${link.download}`);
    }

    // New handler for reverting to a specific HTML version from a message
    function handleRevertToVersion(htmlContent: string) {
        if (!htmlContent || htmlContent.trim() === "") {
            addServerMessage("Cannot revert: No HTML content provided.");
            return;
        }
        generatedHtml = htmlContent;
        addServerMessage("Preview reverted to selected version.");
        scrollToBottom(); // In case server message makes page scroll
    }

    async function handleRetryFromMessage(botMessageId: string): Promise<void> {
        if (isLoading) return;
        if (!(await checkApiKey())) return;

        const botMessageIndex = messages.findIndex(
            (msg) => msg.id === botMessageId && msg.type === "bot",
        );
        if (botMessageIndex === -1) {
            addServerMessage("Error: Could not find the message to retry.");
            return;
        }

        // Find the user message that led to this bot message.
        // Search backwards from the bot message (or its preceding thinking message).
        let userMessageForRetry: UserChatEvent | null = null;
        for (let i = botMessageIndex - 1; i >= 0; i--) {
            const prevMessage = messages[i];
            if (prevMessage.type === "user") {
                userMessageForRetry = prevMessage as UserChatEvent;
                break;
            }
            // If we hit another bot message before a user message, something is off, or it's a complex sequence.
            // For now, we assume a User -> (Thinking) -> Bot sequence for retries.
            if (prevMessage.type === "bot") break;
        }

        if (!userMessageForRetry) {
            addServerMessage(
                "Error: Could not find the original user prompt for this message.",
            );
            return;
        }

        const userPromptContent = userMessageForRetry.content;

        addServerMessage(
            `Retrying generation based on: "${userPromptContent.substring(0, 50)}..."`,
        );
        scrollToBottom();

        isLoading = true;
        const thinkingId = addThinkingMessage();
        scrollToBottom();

        try {
            let newHtmlContent: string;
            // Determine if it's a refinement or initial creation based on current generatedHtml state
            // This assumes the retry should behave like the original attempt in terms of refine vs create.
            const hasExistingContent =
                generatedHtml &&
                generatedHtml.trim() !==
                    "<!-- Start by typing a command to create your page. -->" &&
                generatedHtml.trim() !== "";

            // Also consider if the original user prompt was a refinement instruction
            const wasRefinementInstruction = userPromptContent
                .toLowerCase()
                .startsWith("refine:");

            // If there's existing HTML or the original prompt was explicitly a refinement.
            if (hasExistingContent || wasRefinementInstruction) {
                // If it was a refinement instruction, strip the "Refine: " prefix for the API call
                const actualInstruction = wasRefinementInstruction
                    ? userPromptContent.substring("refine:".length).trim()
                    : userPromptContent;

                newHtmlContent = await refinePage(
                    generatedHtml, // Use current preview as base for refinement
                    actualInstruction,
                    currentModel,
                    currentProvider,
                );
                await storeAndReplaceThinkingWithBotMessage(
                    thinkingId,
                    newHtmlContent,
                    true, // Mark as refinement
                );
            } else {
                newHtmlContent = await createInitialPage(
                    userPromptContent,
                    currentModel,
                    currentProvider,
                );
                await storeAndReplaceThinkingWithBotMessage(
                    thinkingId,
                    newHtmlContent,
                    false, // Mark as initial creation
                );
            }
        } catch (error: any) {
            messages = messages.filter((msg) => msg.id !== thinkingId); // Remove thinking message on error
            const errorMsg =
                error.message ||
                "Failed to process retry request. Please try again.";
            addServerMessage(`Error retrying: ${errorMsg}`);
            console.error("API retry request error:", error);
        } finally {
            isLoading = false;
            scrollToBottom();
        }
    }

    onMount(async () => {
        if (!(await checkApiKey())) {
            // API key not present, modal shown by checkApiKey
        }

        const storedModel =
            await settingsStorage.getSetting<string>(selectedModelKey);
        const storedProvider =
            await settingsStorage.getSetting<string>(selectedProviderKey);

        if (storedModel) currentModel = storedModel;
        if (storedProvider) currentProvider = storedProvider;
        // Ensure defaults are saved if nothing is stored yet
        if (!storedModel) {
            await settingsStorage.setSetting(selectedModelKey, currentModel);
        }
        if (!storedProvider) {
            await settingsStorage.setSetting(
                selectedProviderKey,
                currentProvider,
            );
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

    $effect(() => {
        // This effect will run when ModelSelection updates settings,
        // and helps keep currentModel/currentProvider in sync if ModelSelection directly writes to settings.
        // However, ModelSelection is now designed to update its bound `value` which should trigger reactivity if used.
        // For now, we'll read from settings on change, or ModelSelection could emit an event.
        // A simpler way is to have ModelSelection bind its value to currentModel.
        // Let's adjust ModelSelection to bind its value to a prop passed from this page.

        // Re-fetch from storage if ModelSelection changes it.
        // This can be improved with a more direct state management or event.
        async function updateModelFromSettings() {
            const model =
                await settingsStorage.getSetting<string>(selectedModelKey);
            const provider =
                await settingsStorage.getSetting<string>(selectedProviderKey);
            if (model && model !== currentModel) currentModel = model;
            if (provider && provider !== currentProvider)
                currentProvider = provider;
        }
        // Call it if you expect settings to change from another component not via direct binding
        // For now, ModelSelection's $effect handles saving. This page reads onMount.
        // If ModelSelection is used with bind:value, this $effect might not be strictly needed for model updates.
    });
</script>

<svelte:head>
    <title
        >{currentProject ? currentProject.name : "inja.online"} - {currentModel}</title
    >
</svelte:head>

<div class="flex flex-col h-screen bg-zinc-900 text-white">
    {#if showApiKeyModal}
        <div class="p-4 bg-red-700 text-center">
            {apiKeyErrorMessage}
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
                class="flex-1 bg-zinc-800 m-4 border border-primary-accent rounded-md overflow-hidden p-1"
            >
                <div
                    class="{iframeContainerClasses} h-full bg-white rounded-sm overflow-hidden shadow-xl"
                >
                    {#if generatedHtml && generatedHtml.trim() !== "<!-- Start by typing a command to create your page. -->" && generatedHtml.trim() !== ""}
                        <iframe
                            srcdoc={iframeSrcDoc}
                            class="w-full h-full border-0"
                            title="Generated HTML Preview"
                            sandbox="allow-scripts allow-same-origin"
                        ></iframe>
                    {:else}
                        <div
                            class="flex items-center justify-center h-full bg-white"
                        >
                            <span class="text-zinc-500"
                                >{generatedHtml.includes("Start by typing")
                                    ? "Start by typing a command to create your page."
                                    : "No preview available. Generate content via chat."}</span
                            >
                        </div>
                    {/if}
                </div>
            </div>

            <!-- Attribution -->
            <Footer />
        </div>

        <!-- Resize Handle -->
        <button
            class="w-1 bg-primary-accent hover:bg-secondary-accent cursor-col-resize flex items-center justify-center group"
            class:bg-secondary-accent={isResizing}
            onmousedown={startResize}
            tabindex="0"
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
                <div class="w-48">
                    <!-- Adjust width as needed -->
                    <ModelSelection bind:value={currentModel} />
                </div>
            </header>

            <!-- Messages Container -->
            <div bind:this={messagesContainer} class="chat-section">
                <ChatLayout
                    events={messages}
                    onDownloadHtmlFromMessage={handleDownloadMessageHtml}
                    onRevertToHtmlFromMessage={handleRevertToVersion}
                    onRetryFromMessage={handleRetryFromMessage}
                />
            </div>

            <!-- Input Area -->
            <div class="border-t border-zinc-800 p-4">
                <div class="flex space-x-3 items-end">
                    <textarea
                        bind:value={messageInput}
                        onkeypress={handleKeyPress}
                        placeholder="Type your message or refinement instruction..."
                        disabled={isLoading || showApiKeyModal}
                        class="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-zinc-100 placeholder-zinc-400 resize-none focus:ring-2 focus:ring-zinc-600 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        rows="1"
                    ></textarea>
                    <!-- Send button could be added here if needed -->
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

    .iframe-preview-wrapper {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        overflow: auto;
    }

    .iframe-content,
    .placeholder-content {
        background-color: white;
        box-shadow:
            0 4px 6px -1px rgb(0 0 0 / 0.1),
            0 2px 4px -2px rgb(0 0 0 / 0.1); /* shadow-lg */
        border: none; /* iframe default border */
        transition:
            width 0.3s ease-in-out,
            height 0.3s ease-in-out;
        border-radius: 0.5rem; /* rounded-lg */
    }

    .iframe-preview-wrapper[data-size-mode="desktop"] .iframe-content,
    .iframe-preview-wrapper[data-size-mode="desktop"] .placeholder-content {
        width: 100%;
        height: 100%;
    }

    .iframe-preview-wrapper[data-size-mode="tablet"] .iframe-content,
    .iframe-preview-wrapper[data-size-mode="tablet"] .placeholder-content {
        width: 768px; /* max-w-2xl */
        height: 1024px; /* max-h-[1024px] */
        max-width: 100%;
        max-height: 100%;
    }

    .iframe-preview-wrapper[data-size-mode="mobile"] .iframe-content,
    .iframe-preview-wrapper[data-size-mode="mobile"] .placeholder-content {
        width: 384px; /* max-w-sm */
        height: 844px; /* max-h-[844px] */
        max-width: 100%;
        max-height: 100%;
    }

    /* For placeholder specific styling beyond size/bg/shadow */
    .placeholder-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 2.5rem; /* p-10 */
        color: initial; /* Reset color if needed from parent text-zinc-500 */
    }
</style>
