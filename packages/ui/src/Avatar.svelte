<script lang="ts">
	import { useQuery } from '@sveltestack/svelte-query';
    import { Avatar } from '@skeletonlabs/skeleton';
    import { XMLParser } from 'fast-xml-parser';

    const parser = new XMLParser();

    export let userId: string|undefined;
    export let username: string|undefined;
    export let endpoint: string;

    async function fetchObjectKey(userId: string) {
        const response = await fetch(`${endpoint}/avatars/?list-type=2&prefix=${userId}`);
        const data = await response.text();

        const doc = parser.parse(data);

        let key;

        if (doc.ListBucketResult.Contents && doc.ListBucketResult.Contents.Key) {
            key = doc.ListBucketResult.Contents.Key
        }

        return { key };
    }

    $: query = useQuery({
        queryKey: ['avatar', userId],
        queryFn: async () => await fetchObjectKey(userId),
        enabled: !!userId
    });
</script>

<Avatar src={$query.data?.key ? `${endpoint}/avatars/${$query.data.key}` : undefined} initials={username} {...$$restProps} />
