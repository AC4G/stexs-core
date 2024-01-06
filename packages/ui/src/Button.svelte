<script lang="ts">
  import { ProgressRadial, popup } from '@skeletonlabs/skeleton';

  export let submitted: boolean = $$restProps.submitted || false;
  export let type: 'button' | 'submit' | 'reset' = 'button';
  export let title: string | undefined = undefined;
  export let loaderMeter: string = 'stroke-surface-50';
  export let loaderTrack: string = '';
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
    <ProgressRadial stroke={40} strokeLinecap="round" meter={loaderMeter} track={loaderTrack} class="w-[24px]" />
  {:else}
    <slot />
  {/if}
</button>
