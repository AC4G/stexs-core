<script lang="ts">
	import { useQuery } from '@sveltestack/svelte-query';
    import { Avatar } from '@skeletonlabs/skeleton';

    export let stexs: any;
    export let username: string|undefined;

    async function fetchUrl(username: string) {
        const { url }  = await (await stexs.storage.getAvatarUrl(username)).json();

        return { url };
    } 

    $: query = useQuery({
        queryKey: ['avatar', username],
        queryFn: async () => await fetchUrl(username),
        enabled: !!username
    });
</script>

<Avatar src={$query.data?.url} initials={username} {...$$restProps} />
