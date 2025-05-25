<script>
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import { projectStorage, timeAgo } from "$lib/storage";

    let allProjects = $state([]);

    onMount(async () => {
        try {
            const projects = await projectStorage.getAll();
            allProjects = projects;
        } catch (error) {
            console.error('Failed to load projects:', error);
        }
    });

    function handleProjectClick(projectId) {
        goto(`/s/${projectId}`);
    }

    function goBack() {
        goto("/");
    }

    async function handleDelete(event, projectId) {
        event.stopPropagation();
        try {
            await projectStorage.delete(projectId);
            allProjects = allProjects.filter((project) => project.id !== projectId);
        } catch (error) {
            console.error('Failed to delete project:', error);
        }
    }
</script>

<div class="min-h-screen bg-dark-primary text-white p-8 flex flex-col">
    <!-- Top Section with Brand and Back Link -->
    <div class="flex justify-between items-start mb-16">
        <a href="https://inja.online" target="_blank" class="text-2xl font-medium text-primary-accent tracking-wide">
            INJA.ONLINE
        </a>
        <button
            class="text-sm text-primary-accent hover:text-white transition-colors duration-200"
            onclick={goBack}
        >
            ← back
        </button>
    </div>

    <!-- Main Content Container -->
    <div class="flex-1 flex items-start justify-center">
        <div class="w-full max-w-2xl space-y-8">
            <!-- Page Title -->
            <h2 class="text-3xl font-light text-white text-center">
                All Projects
            </h2>

            <!-- Projects List -->
            {#if allProjects.length === 0}
                <div class="text-center text-text-muted py-12">
                    <p>No projects yet. Create your first project to get started!</p>
                </div>
            {:else}
                <div class="space-y-3">
                    {#each allProjects as project}
                        <div
                            role="button"
                            tabindex="0"
                            class="w-full p-4 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 transition-all duration-200 text-left group relative cursor-pointer"
                            onclick={() => handleProjectClick(project.id)}
                            onkeydown={(e) => e.key === 'Enter' && handleProjectClick(project.id)}
                        >
                            <div class="flex justify-between items-center">
                                <div>
                                    <h4
                                        class="text-white font-medium group-hover:text-primary-accent transition-colors duration-200"
                                    >
                                        {project.name}
                                    </h4>
                                    {#if project.description}
                                        <p class="text-text-muted text-sm mt-1">
                                            {project.description}
                                        </p>
                                    {/if}
                                </div>
                                <div class="flex items-center gap-3">
                                    <span class="text-text-muted text-sm">
                                        {timeAgo(project.updatedAt)}
                                    </span>
                                    <button
                                        class="opacity-0 group-hover:opacity-100 p-1 text-text-muted hover:text-red-400 transition-all duration-200 z-10"
                                        onclick={(e) => handleDelete(e, project.id)}
                                        title="Delete project"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
    </div>

    <!-- Bottom Attribution -->
    <div class="text-center">
        <p class="text-text-muted text-xs">Powered by Cerebras API</p>
    </div>
</div>
