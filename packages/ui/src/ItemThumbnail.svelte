<script lang="ts">
  import { createQuery } from '@tanstack/svelte-query';

  export let stexs: any;
  export let itemId: string;
  export let itemName: string;
  export let showOnFail: boolean = true;
  export let imageClass: string = "";

  let loading: boolean = true;
  let loaded: boolean = false;
  let failed: boolean = false;
  let prevUrl: string = '';

  const query = createQuery({
      queryKey: ['itemThumbnail', itemId],
      queryFn: async () => {
        return await stexs.storage.getItemThumbnailUrl(itemId)
      }
  });

  const img = new Image();

  $: {
    if ($query.data && prevUrl !== $query.data)
      img.src = $query.data;

      img.onload = () => {
        loading = false;
        loaded = true;
      };

      img.onerror = () => {
        loading = false;
        failed = true;
      };

      prevUrl = $query.data;
  }
</script>
 
{#if loading}
  <div class="placeholder aspect-square animate-pulse w-full h-full" />
{:else if failed && showOnFail}
  <p class="text-[18px] whitespace-pre-line p-4 text-center">{itemName}</p>
{:else if loaded}
  <img class="h-full w-full object-cover rounded-none {imageClass}" draggable="false" src={prevUrl} alt={itemName} />
{/if}
