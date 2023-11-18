<script lang="ts">
  import { ProgressRadial } from '@skeletonlabs/skeleton';

  export let submitted = $$restProps.submitted || false;
</script>

<button
  on:click
  on:mouseover
  on:mouseenter
  on:mouseleave
  on:focus
  class={submitted
    ? $$restProps.class + ' opacity-50 cursor-not-allowed btn'
    : $$restProps.class + ' btn'}
  {...$$restProps.disabled ? { disabled: true } : {}}
>
  {#if submitted}
    <ProgressRadial stroke={40} strokeLinecap="round" class="w-[24px]" />
  {:else}
    <slot />
  {/if}
</button>
