<script lang="ts">
    import type { SvelteComponent } from 'svelte';
    import { getModalStore, Paginator, type PaginationSettings } from '@skeletonlabs/skeleton';
    import Icon from "@iconify/svelte";
    import Button from '../Button.svelte';
    import { Search } from "flowbite-svelte";
    import { useQuery } from '@sveltestack/svelte-query';
    import { debounce } from "lodash";
    import Avatar from '../Avatar.svelte';

    export let parent: SvelteComponent;

    const modalStore = getModalStore();
    const stexs = $modalStore[0].meta.stexsClient;
    const userId = $modalStore[0].meta.userId;
    let search: string = '';
    let paginationSettings: PaginationSettings = {
        page: 0,
        limit: 50, 
        size: 0,
        amounts: [50, 100, 250, 500, 1000],
    };
    const handleSearch = debounce((e: Event) => {
        search = (e.target as HTMLInputElement)?.value || '';
    }, 200);

    async function fetchUserProfiles(search: string, page: number, limit: number) {
        if (search.length === 0) return;

        const start = page * limit;
        const end = start + limit - 1;

        const { data, count } = await stexs.from('profiles')
            .select(`
                user_id,
                username,
                accept_friend_requests,
                friends!friends_user_id_fkey(
                    user_id,
                    friend_id
                ),
                friend_requests!friend_requests_addressee_id_fkey(
                    requester_id
                )
            `, { count: 'exact' })
            .ilike('username', `%${search}%`)
            .order('username', { ascending: true })
            .eq('friends.friend_id', userId)
            .eq('friend_requests.requester_id', userId)
            .range(start, end);

        paginationSettings.size = count;
        
        return data;
    }

    $: searchForFriendsQuery = useQuery({
        queryKey: ['searchForFriends', userId, paginationSettings.page, paginationSettings.limit],
        queryFn: async () => fetchUserProfiles(search, paginationSettings.page, paginationSettings.limit)
    });
</script>

{#if $modalStore[0]}
    <div class="card p-5 space-y-6 flex flex-col max-w-[958px] min-h-[90vh] w-full relative">
        <div>
            <div class="absolute right-[8px] top-[8px]">
                <Button on:click={parent.onClose} class="p-3 hover:text-gray-600">
                    <Icon icon="ph:x-bold" />
                </Button>
            </div>
            <div class="h-fit">
                <p class="text-[22px]">Add Friends</p>
            </div>
        </div>
        <Search size="lg" placeholder="Username" on:input={handleSearch} class="!bg-surface-500 !outline-none" />
        <div class="grid gap-2 place-items-center grid-cols-1">
            {#if $searchForFriendsQuery.data}
                {#each $searchForFriendsQuery.data as profile (profile.user_id)}
                    <div class="flex flex-row rounded-md transition items-center justify-between px-4 py-2 w-full border border-solid border-surface-600 space-x-4">
                        <a href="/{profile.username}" class="flex h-full justify-left group">
                            <Avatar class="aspect-square" userId={profile.user_id} username={profile.username} {stexs} />
                            <p class="text-[18px] text-left pl-4 break-all group-hover:text-secondary-400 transition">{profile.username}</p>
                        </a>
                        {#if profile.friends.length > 0}
                            <p class="text-[16px] badge variant-ghost-surface">Is Friend</p>
                        {:else if profile.user_id === userId}
                            <p class="text-[16px] badge variant-ghost-surface">You</p>
                        {:else if profile.friend_requests.length > 0}
                            <Button title="Revoke Friend Requests" class="h-fit text-[14px] variant-ghost-error py-2 px-2">
                                <Icon icon="pepicons-pop:minus" />
                            </Button>
                        {:else if profile.accept_friend_requests}
                            <Button title="Send Friend Requests" class="h-fit text-[14px] variant-filled-primary py-2 px-2">
                                <Icon icon="pepicons-pop:plus" />
                            </Button>
                        {/if}
                    </div>
                {/each}
            {/if}
            {#if search.length > 0 && $searchForFriendsQuery.data?.length === 0}
                <p class="text-[18px]">No users found</p>
            {/if}
        </div>
        <div class="{search.length > 0 ? 'mt-[18px]' : ''}">
            {#if $searchForFriendsQuery.isLoading}
                <div class="flex justify-between flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
                    <div class="placeholder animate-pulse h-[44px] w-full md:w-[150px]" />
                    <div class="placeholder animate-pulse h-[38px] w-[110px]" />
                </div>
            {:else if search.length > 0 && paginationSettings.size > 0 }
                <Paginator
                    bind:settings={paginationSettings}
                    showFirstLastButtons="{false}"
                    showPreviousNextButtons="{true}"
                    showNumerals
                    amountText="Users"
                    select="!bg-surface-500 !border-gray-600 select min-w-[150px]"
                    controlVariant="bg-surface-500 border border-solid border-gray-600"
                />
            {/if}
        </div>
    </div>
{/if}
