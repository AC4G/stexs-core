<script lang="ts">
  import { useQuery } from '@sveltestack/svelte-query';

  export let stexs: any;
  export let itemId: string;
  export let itemName: string;

  let loading: boolean = true;
  let loaded: boolean = false;
  let failed: boolean = false;
  let prevUrl: string = '';

  const query = useQuery({
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
  <div class="placeholder animate-pulse w-full h-full" />
{:else if failed}
  <p class="text-[18px] whitespace-pre-line p-4">{itemName}</p>
{:else if loaded}
 <img class="h-full w-full object-cover rounded-none" draggable="false" src={prevUrl} alt={itemName} />
{/if}
