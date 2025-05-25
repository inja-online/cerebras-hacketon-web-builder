<script>
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { projectStorage, timeAgo } from '$lib/storage';

  let displayedProjects = $state([]);

  onMount(async () => {
    try {
      const projects = await projectStorage.getRecent(5);
      displayedProjects = projects;
    } catch (error) {
      console.error('Failed to load recent projects:', error);
    }
  });

  function handleProjectClick(projectId) {
    goto(`/s/${projectId}`);
  }

  function handleSeeAll() {
    goto('/projects');
  }

  async function handleDelete(event, projectId) {
    event.stopPropagation();
    try {
      await projectStorage.delete(projectId);
      displayedProjects = displayedProjects.filter(project => project.id !== projectId);
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  }
</script>

{#if displayedProjects.length > 0}
  <div class="w-full">
    <div class="flex justify-between items-center mb-6">
      <h3 class="text-lg font-medium text-white">Recent Projects</h3>
      <button
        class="text-sm text-primary-accent hover:text-white transition-colors duration-200"
        onclick={handleSeeAll}
      >
        See all
      </button>
    </div>
    
    <div class="space-y-3">
      {#each displayedProjects as project}
        <div
          role="button"
          tabindex="0"
          class="w-full p-4 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 transition-all duration-200 text-left group relative cursor-pointer"
          onclick={() => handleProjectClick(project.id)}
          onkeydown={(e) => e.key === 'Enter' && handleProjectClick(project.id)}
        >
          <div class="flex justify-between items-center">
            <h4 class="text-white font-medium group-hover:text-primary-accent transition-colors duration-200">
              {project.name}
            </h4>
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
  </div>
{/if}
