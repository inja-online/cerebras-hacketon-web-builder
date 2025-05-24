<script>
    import { goto } from "$app/navigation";

    let allProjects = $state([
        {
            id: "a1b2c3",
            title: "E-commerce Dashboard",
            time: "2 hours ago",
        },
        {
            id: "d4e5f6",
            title: "Portfolio Website",
            time: "1 day ago",
        },
        {
            id: "g7h8i9",
            title: "Landing Page",
            time: "3 days ago",
        },
        {
            id: "j0k1l2",
            title: "Blog Template",
            time: "1 week ago",
        },
        {
            id: "m3n4o5",
            title: "Admin Panel",
            time: "2 weeks ago",
        },
        {
            id: "p6q7r8",
            title: "Marketing Site",
            time: "3 weeks ago",
        },
    ]);

    function handleProjectClick(projectId) {
        goto(`/s/${projectId}`);
    }

    function goBack() {
        goto("/");
    }

    function handleDelete(event, projectId) {
        event.stopPropagation();
        allProjects = allProjects.filter((project) => project.id !== projectId);
    }
</script>

<div class="min-h-screen bg-dark-primary text-white p-8 flex flex-col">
    <!-- Top Section with Brand and Back Link -->
    <div class="flex justify-between items-start mb-16">
        <h1 class="text-2xl font-medium text-primary-accent tracking-wide">
            INJA.ONLINE
        </h1>
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
                            <h4
                                class="text-white font-medium group-hover:text-primary-accent transition-colors duration-200"
                            >
                                {project.title}
                            </h4>
                            <div class="flex items-center gap-3">
                                <span class="text-text-muted text-sm">
                                    {project.time}
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
        </div>
    </div>

    <!-- Bottom Attribution -->
    <div class="text-center">
        <p class="text-text-muted text-xs">Powered by Cerebras API</p>
    </div>
</div>
