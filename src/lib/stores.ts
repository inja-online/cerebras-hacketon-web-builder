// Svelte 5 style for a reactive store.
// Properties declared with $state within a class instance become reactive.

class UiStore {
    /**
     * Stores the ID of the message whose action menu is currently active.
     * Can be used to ensure only one menu is open at a time if using click-to-toggle.
     * For hover-based menus, this might be less critical but available for future use.
     */
    activeMessageMenuId = $state<string | null>(null);

    setActiveMenu(id: string | null) {
        this.activeMessageMenuId = id;
    }

    constructor() {
        // Initialize or perform other setup if needed
    }
}

export const uiStore = new UiStore();
