<script lang="ts">
	import { useQuery } from '@sveltestack/svelte-query';
    import { Avatar } from '@skeletonlabs/skeleton';

    export let stexs: any;
    export let userId: string;
    export let username: string|undefined;

    async function fetchUrl(userId: string) {
        return { 
            url: (await (await stexs.storage.getAvatarUrl(userId)).json()).url
        };
    } 

    $: query = useQuery({
        queryKey: ['avatar', userId],
        queryFn: async () => await fetchUrl(userId),
        enabled: !!userId
    });
</script>

<Avatar src={$query.data?.url} initials={username} {...$$restProps} />
