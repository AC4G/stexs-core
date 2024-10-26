<script lang="ts">
	import StexsClient from 'stexs-client';
	import { createQuery } from '@tanstack/svelte-query';
	import { Avatar } from '@skeletonlabs/skeleton';

	export let stexs: StexsClient;
	export let userId: string;
	export let username: string | undefined;

	$: urlQuery = createQuery({
		queryKey: ['avatarUrl', userId],
		queryFn: async () => await stexs.storage.getAvatarUrl(userId),
		enabled: !!userId,
	});

	$: pathUrl = $urlQuery.data ? new URL($urlQuery.data) : null;

	$: imageQuery = createQuery({
		queryKey: ['avatarImage', userId],
		queryFn: async () => {
			try {
				let headers = {};
				const etag = stexs.storage.getAvatarETagFromCache(userId);

				if (etag) {
					headers = {
						'If-None-Match': etag,
					};
					pathUrl.searchParams.set('timestamp', new Date().getTime().toString());
				}

				const response = await fetch(pathUrl, {
					headers,
				});

				if (response.status === 304) {
					return stexs.storage.getAvatarObjectUrlFromCache(userId);
				}

				if (response.status !== 200) return '';
				
				const blob = await response.blob();
				const url = URL.createObjectURL(blob);

				const newETag = response.headers.get('ETag') || response.headers.get('Etag');

				if (newETag) {
					stexs.storage.setAvatarETagAndUrlInCache(userId, newETag, url);
				}

				return url;
			} catch (error) {
				return '';
			}
		},
		enabled: !!$urlQuery.data,
	});
</script>

<Avatar src={$imageQuery.data} initials={username} {...$$restProps} />
