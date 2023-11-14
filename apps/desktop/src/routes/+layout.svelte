<script lang="ts">
  import '../app.postcss';
  import { AppShell, setInitialClassState } from '@skeletonlabs/skeleton';

  setInitialClassState();
</script>

<AppShell>
  <slot />
</AppShell>
