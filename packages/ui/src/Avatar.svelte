<script lang="ts">
	import { createQuery } from '@tanstack/svelte-query';
    import { Avatar } from '@skeletonlabs/skeleton';

    export let stexs: any;
    export let userId: string;
    export let username: string | undefined;

    let etag: string | null = null;
    let headers;
    let previousObjectUrl;

    $: urlQuery = createQuery({
        queryKey: ['avatarUrl', userId],
        queryFn: async () => await stexs.storage.getAvatarUrl(userId),
        enabled: !!userId
    });

    $: pathUrl = $urlQuery.data ? new URL($urlQuery.data) : null;

    $: imageQuery = createQuery({
        queryKey: ['avatarImage', userId],
        queryFn: async () => {
            try {
                if (etag) {
                    headers =  {
                        'If-None-Match': etag
                    };
                }

                pathUrl.searchParams.set('timestamp', new Date().getTime().toString());

                const response = await fetch(pathUrl, {
                    headers
                });

                if (response.status === 304) {
                    return previousObjectUrl;
                }

                if (response.status !== 200) return '';

                etag = response.headers.get('ETag');

                const blob = await response.blob();

                const url = URL.createObjectURL(blob)

                previousObjectUrl = url;
                
                return url;
            } catch (error) {
                return '';
            }
        },
        enabled: !!$urlQuery.data
    });
</script>

<Avatar src={$imageQuery.data} initials={username} {...$$restProps} />
