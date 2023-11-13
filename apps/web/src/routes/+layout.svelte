<script lang="ts">
  import '../app.postcss';
  import { AppShell, setInitialClassState } from '@skeletonlabs/skeleton';
</script>

<svelte:head>
  {@html `<script>(${setInitialClassState.toString()})();</script>`}
</svelte:head>
<AppShell>
  <slot />
</AppShell>
