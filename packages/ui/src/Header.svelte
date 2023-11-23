<script>
  import { AppBar } from '@skeletonlabs/skeleton';
  import { page } from '$app/stores';
</script>

<AppBar
  gridColumns="grid-cols-3"
  slotDefault="place-self-center"
  slotTrail="place-content-end"
  class="h-[80px]"
>
  <svelte:fragment slot="lead">
    {#if $page.path === '/'}
      <a href="/" class="h4 tracking-wider">STEXS</a>
    {:else}
     <h4 class="h4 tracking-wider cursor-default">STEXS</h4>
    {/if}
  </svelte:fragment>

  <svelte:fragment slot="trail">
    <slot />
  </svelte:fragment>
</AppBar>
