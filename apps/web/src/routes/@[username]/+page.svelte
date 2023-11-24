<script lang="ts">
    import { page } from "$app/stores";
    import { Avatar } from "ui";
    import { user } from "$lib/stores/user";
    import { PUBLIC_S3_ENDPOINT } from '$env/static/public';
    import { stexs } from "../../stexsClient";
    import { createQuery } from '@tanstack/svelte-query';

    const username: string = $page.params.username;

    const query = createQuery({
        queryKey: ['userProfile'],
        queryFn: async () => {
            if ($user?.userId) {
                return { user_id: $user.userId };
            }

            const { data } = await stexs.from('profiles').select('user_id').eq('username', username);
            return data[0];
        }
    });
</script>

<div class="w-screen h-screen bg-no-repeat bg-top bg-[url('https://cdn.cloudflare.steamstatic.com/steam/clusters/sale_autumn2019_assets/54b5034d397baccb93181cc6/home_header_bg_rainy_english.gif?t=1700618391')]">
    <div class="flex items-center h-screen flex-col">
        <div class="rounded-md p-4 bg-surface-800 bg-opacity-60 backdrop-blur-sm max-w-[800px] mt-[80px] border-surface-800 border w-[800px]">
            {#if $query.isLoading}
                <div class="placeholder-circle animate-pulse w-[148px]" />
            {:else}
                <Avatar endpoint={PUBLIC_S3_ENDPOINT} userId={$query.data?.user_id} username={username} class="w-[148px] border-4 border-surface-300-600-token" />
                {username}
            {/if}
        </div>
    </div>
</div>
