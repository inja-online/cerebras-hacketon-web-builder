<script>
  import { goto } from '$app/navigation';
    import { onMount } from 'svelte';

  const mockProjects = [
    {
      id: 'a1b2c3',
      title: 'E-commerce Dashboard',
      time: '2 hours ago'
    },
    {
      id: 'd4e5f6',
      title: 'Portfolio Website',
      time: '1 day ago'
    },
    {
      id: 'g7h8i9',
      title: 'Landing Page',
      time: '3 days ago'
    },
    {
      id: 'j0k1l2',
      title: 'Blog Template',
      time: '1 week ago'
    }
  ];
  let displayedProjects = $state([]);

  onMount(()=>{
    displayedProjects = mockProjects.slice(0, 5)
  });

  function handleProjectClick(projectId) {
    goto(`/s/${projectId}`);
  }

  function handleSeeAll() {
    goto('/projects');
  }

  function handleDelete(event, projectId) {
    event.stopPropagation();
    displayedProjects = displayedProjects.filter(project => project.id !== projectId);
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
{/if}
