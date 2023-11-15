<script>
  import { AppBar } from '@skeletonlabs/skeleton';

  export let signedIn = false;
</script>

<AppBar
  gridColumns="grid-cols-3"
  slotDefault="place-self-center"
  slotTrail="place-content-end"
>
  <svelte:fragment slot="lead">
    <a href="/" class="h4 tracking-wider">STEXS</a>
  </svelte:fragment>

  <svelte:fragment slot="trail">
    {#if !signedIn}
      <a href="/sign-in" class="btn">Sign-In</a>
      <a href="/sign-up" class="btn variant-filled-primary">Sign-Up</a>
    {:else}
      User
    {/if}
  </svelte:fragment>
</AppBar>
