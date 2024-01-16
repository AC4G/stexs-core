<script>
  import { AppBar } from '@skeletonlabs/skeleton';
  import { page } from '$app/stores';
</script>

<AppBar
  gridColumns="grid-cols-3"
  slotDefault="place-self-center"
  slotTrail="place-content-end"
  class="h-[70px] flex justify-center border-b border-solid border-surface-500"
>
  <svelte:fragment slot="lead">
    {#if $page.url.pathname === '/'}
      <h4 class="h4 tracking-wider cursor-default">STEXS</h4>
    {:else}
      <a href="/" class="h4 tracking-wider">STEXS</a>
    {/if}
  </svelte:fragment>

  <svelte:fragment slot="trail">
    <slot />
  </svelte:fragment>
</AppBar>
