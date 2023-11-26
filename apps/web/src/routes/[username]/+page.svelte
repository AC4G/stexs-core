<script lang="ts">
    import { page } from "$app/stores";
    import { Avatar, Button } from "ui";
    import { user } from "$lib/stores/user";
    import { PUBLIC_S3_ENDPOINT } from '$env/static/public';
    import { stexs } from "../../stexsClient";
    import { createQuery } from '@tanstack/svelte-query';
    import { TabAnchor, TabGroup } from "@skeletonlabs/skeleton";
    import { goto } from "$app/navigation";
    import { getFlash } from "sveltekit-flash-message/client";

    const flash = getFlash(page);
    $: username = $page.params.username;
    $: tabSet = $page.url.searchParams.get('tab');

    async function userProfile(username: string) {
        const { data: profiles } = await stexs.from('profiles').select('user_id,username,is_private').eq('username', username);
        
        if (profiles.length === 0 && username !== undefined) {
            $flash = {
                message: 'User or account not found.',
                classes: 'variant-ghost-error',
                timeout: 5000,
            };
            return goto('/');
        }

        return profiles[0];
    }
    
    $: getProfile = userProfile(username);
</script>

<div class="w-screen h-screen bg-no-repeat bg-top bg-[url('https://cdn.cloudflare.steamstatic.com/steam/clusters/sale_autumn2019_assets/54b5034d397baccb93181cc6/home_header_bg_rainy_english.gif?t=1700618391')]">
    <div class="grid place-items-center">
        <div class="rounded-md py-8 px-4 sm:px-8 bg-surface-600 bg-opacity-60 backdrop-blur-sm border-surface-800 border max-w-screen-sm md:max-w-screen-md lg:max-w-screen-lg w-full mt-[40px]">
            <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 grid-rows-2 gap-y-8">
                {#await getProfile}
                    <div class="placeholder-circle animate-pulse w-[148px]" />
                    <div class="grid grid-rows-3 gap-y-4 sm:gap-0 sm:pt-[12px] pl-4 sm:pl-[12px]">
                        <div class="placeholder animate-pulse w-[120px] h-[20px]" />
                        <div class="placeholder animate-pulse w-[100px] h-[20px]" />
                    </div>
                    <div class="placeholder animate-pulse row-start-2 col-span-2 sm:col-span-3 md:col-span-4 xl:col-span-5 rounded-md h-full" />
                {:then profile}
                    <Avatar endpoint={PUBLIC_S3_ENDPOINT} userId={profile.user_id} username={username} class="mx-auto w-[120px] sm:w-[148px]" />
                    <div class="grid grid-rows-3 gap-y-4 sm:gap-0 sm:pt-[12px] pl-4 sm:pl-[12px]">
                        <p class="text-[20px]">{profile.username}</p>
                        {#if !profile.is_private || $user?.id === profile.user_id}
                            <p class="text-[18px]">Friends {0}</p>
                        {:else if $user?.id}
                            <Button class="variant-filled-primary">Send Friend Request</Button>
                        {/if}
                    </div>
                    {#if !profile.is_private}
                        <TabGroup active="variant-filled-primary" border="border-b-2 border-surface-500" hover="hover:bg-surface-500" class="row-start-2 col-span-2 sm:col-span-3 md:col-span-4 xl:col-span-5 bg-surface-800 rounded-md p-4" justify="justify-center">
                            <TabAnchor href="/{username}" selected={$page.url.searchParams.get('tab') === null} >
                                <span>Inventory</span>
                            </TabAnchor>
                            <TabAnchor href="/{username}?tab=friends" selected={$page.url.searchParams.get('tab') === 'friends'} >
                                <span>Friends</span>
                            </TabAnchor>
                            <TabAnchor href="/{username}?tab=organizations" selected={$page.url.searchParams.get('tab') === 'organizations'} >
                                <span>Organizations</span>
                            </TabAnchor>
                            <svelte:fragment slot="panel">
                                {#if tabSet === null}
                                    Inventory
                                {:else if tabSet === 'friends'}
                                    Friends
                                {:else if tabSet === 'organizations'}
                                    Organizations
                                {/if}
                            </svelte:fragment>
                        </TabGroup>
                    {:else}
                        <div class="grid row-start-2 col-span-2 sm:col-span-3 md:col-span-4 xl:col-span-5 place-items-center bg-surface-800 rounded-md">
                            <p class="text-[22px] variant-ghost-tertiary p-4 rounded-md">User is private</p>
                        </div>
                    {/if}
                {/await}
            </div>
        </div>
    </div>
</div>
