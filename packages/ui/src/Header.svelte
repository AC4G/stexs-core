<script>
  import { AppBar } from '@skeletonlabs/skeleton';
  import { page } from '$app/stores';
  import Button from './Button.svelte';
  import Icon from '@iconify/svelte';

  export let sidebarRoutes;
  export let drawerStore;


</script>

<AppBar
  gridColumns="grid-cols-3"
  slotDefault="place-self-center"
  slotTrail="place-content-end"
  class="h-[70px] flex justify-center border-b border-surface-500"
>
  <svelte:fragment slot="lead">
    <div class="flex items-center space-x-2">
      {#if sidebarRoutes.find(route => $page.url.pathname.startsWith(route)) }
        <Button on:click={() => drawerStore.open({})} class="lg:hidden p-2 border rounded border-surface-500 bg-surface-700">
          <Icon icon="octicon:three-bars-16" width="18" />
        </Button>
      {/if}
      {#if $page.url.pathname === '/'}
        <h4 class="h4 tracking-wider mt-[2px] md:mt-0">STEXS</h4>
      {:else}
        <a href="/" class="h4 tracking-wider mt-[2px] md:mt-0">STEXS</a>
      {/if}
    </div>
  </svelte:fragment>

  <svelte:fragment slot="trail">
    <slot />
  </svelte:fragment>
</AppBar>
