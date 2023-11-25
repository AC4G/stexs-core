<script lang="ts">
    import { Avatar } from '@skeletonlabs/skeleton';
    import { XMLParser } from 'fast-xml-parser';
    import { createQuery } from '@tanstack/svelte-query';

    const parser = new XMLParser();

    export let userId: string|undefined;
    export let username: string|undefined;
    export let endpoint: string;

    const query = createQuery({
        queryKey: ['avatar'],
        queryFn: async () => {
            if (username && userId) {
                const response = await fetch(`${endpoint}/avatars/?list-type=2&prefix=${userId}`);
                const data = await response.text();

                const doc = parser.parse(data);
                return { key: doc.ListBucketResult.Contents.Key };
            }
        }
    });
</script>

<Avatar src={$query.data?.key && `${endpoint}/avatars/${$query.data.key}`} initials={username} {...$$restProps} />
