<script lang="ts">
	import { createQuery } from '@tanstack/svelte-query';
    import { Avatar } from '@skeletonlabs/skeleton';

    export let stexs: any;
    export let userId: string;
    export let username: string|undefined;

    $: query = createQuery({
        queryKey: ['avatar', userId],
        queryFn: async () => {
            return await stexs.storage.getAvatarUrl(userId)
        },
        enabled: !!userId
    });
</script>

<Avatar src={$query.data} initials={username} {...$$restProps} />
