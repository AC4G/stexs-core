<script lang="ts">
	import StexsClient from 'stexs-client';
	import { createQuery } from '@tanstack/svelte-query';
	import { Avatar } from '@skeletonlabs/skeleton';

	export let stexs: StexsClient;
	export let userId: string;
	export let username: string | undefined;

	let state: boolean = false;

	$: urlQuery = createQuery({
		queryKey: ['avatarUrl', userId],
		queryFn: async () => await stexs.storage.getAvatarUrl(userId),
		enabled: !!userId,
	});

	function getETagFromResponseHeaders(headers: Headers): string | null {
		return headers.get('ETag') || headers.get('Etag') || headers.get('etag');
	}

	$: imageQuery = createQuery({
		queryKey: ['avatarImage', userId],
		queryFn: async () => {
			let avatarUrl = $urlQuery.data ? new URL($urlQuery.data) : null;

			try {
				if (!avatarUrl) return '';

				const etag = stexs.storage.getAvatarETagFromCache(userId);

				let headers = {};

				if (etag) {
					headers['If-None-Match'] = etag
				}

				const response = await fetch(avatarUrl, {
					headers
				});

				if (response.status === 304) return $imageQuery.data;

				if (!response.ok) return '';

				const newETag = getETagFromResponseHeaders(response.headers);

				if (newETag && newETag !== etag) {
					stexs.storage.setAvatarETagInCache(userId, newETag);
				}

				const blob = await response.blob();
				return URL.createObjectURL(blob);
			} catch (error) {
				return '';
			}
		},
		enabled: !!$urlQuery.data
	});
</script>

<Avatar src={$imageQuery?.data} initials={username} {...$$restProps} />
