<script lang="ts">
  let buttonProps = {
    ...$$restProps,
    class: ($$restProps.class || '') + ' btn',
  };
</script>

<button
  on:click
  on:mouseover
  on:mouseenter
  on:mouseleave
  on:focus
  {...buttonProps}
>
  <slot />
</button>
