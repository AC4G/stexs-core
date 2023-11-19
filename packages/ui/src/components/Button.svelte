<script lang="ts">
  import { ProgressRadial } from '@skeletonlabs/skeleton';

  export let submitted: boolean = $$restProps.submitted || false;
  export let type: 'button' | 'submit' | 'reset' = 'button';
  export let title: string | undefined;
</script>

<button
  on:click
  on:mouseover
  on:mouseenter
  on:mouseleave
  on:focus
  {type}
  {title}
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
