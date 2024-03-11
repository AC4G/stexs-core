<script lang="ts">
	import { getModalStore } from '@skeletonlabs/skeleton';
    import { createQuery } from "@tanstack/svelte-query";
    import { getUserStore } from "$lib/stores/userStore";
    import { Button } from "ui";
    import { stexs } from "../../../stexsClient";
    import { openUpdatePasswordModal } from "$lib/utils/modals/userModals";
    import { getFlash } from 'sveltekit-flash-message/client';
    import { page } from '$app/stores';

    const userStore = getUserStore();
    const modalStore = getModalStore();
    const flash = getFlash(page);

    let showEmail: boolean = false;
    let enabledMethods: string[];

    function toggleShowEmail() {
        showEmail = !showEmail;
    }

    const emailQuery = createQuery({
        queryKey: ['settingsEmail'],
        queryFn: () => {
            return $userStore?.email;
        },
        enabled: !!$userStore
    });

    const authQuery = createQuery({
        queryKey: ['authState'],
        queryFn: async () => {
            return await (await stexs.auth.mfa.factorStatus()).json();
        },
        enabled: !!$userStore
    });

    $: if ($authQuery.data) {
        enabledMethods = Object.entries($authQuery.data)
            .filter(([key, value]) => value === true)
            .map(([key, _]) => key);
    }

    $: email = $emailQuery.data;
    $: emailHidden = email && email.split('@').map(part => part.length > 2 ? part[0] + '*'.repeat(part.length - 2) + part.slice(-1) : part).join('@');
</script>

<div class="px-[4%] md:px-[8%] grid place-items-center">
    <div class="w-full my-[40px] lg:max-w-[1200px] space-y-6">
        <div class="space-y-2">
            <h2 class="h2">Account</h2>
            <hr class="!border-t-2">
        </div>
        {#if $emailQuery.data && $userStore}
            <div class="bg-surface-700 rounded-md p-4 border border-surface-600">
                <p class="text-[16px] text-surface-300">Email</p>
                <div class="flex flex-row justify-between items-center">
                    <div class="flex flex-row items-center space-x-2">
                        <p class="text-[16px]">{#if showEmail}{email}{:else}{emailHidden}{/if}</p>
                        <Button on:click={toggleShowEmail} class="variant-ghost-surface px-2 py-1">{#if showEmail}Hide{:else}Show{/if}</Button>
                    </div>
                    <Button class="variant-filled-primary px-2 py-1">Edit</Button>
                </div>
            </div>
        {/if}
        <div class="space-y-2">
            <h3 class="h3">Security</h3>
            <hr class="!border-t-2">
        </div>
        <div class="space-y-8">
            <Button on:click={() => openUpdatePasswordModal(enabledMethods, stexs, flash, modalStore)} class="variant-filled-primary px-2 py-1">Change Password</Button>
            {#if $authQuery.data}
                <div class="space-y-1">
                    <p class="text-surface-300">Authenticator App</p>
                    {#if $authQuery.data.totp}
                        <Button class="variant-ghost-surface px-2 py-1 text-red-600">Remove Authenticator App</Button>
                    {:else}
                        <Button class="variant-filled-primary px-2 py-1">Enable Authenticator App</Button>
                    {/if}
                </div>
                <div class="space-y-1">
                    <p class="text-surface-300">Email Authentication</p>
                    {#if $authQuery.data.email}
                        <Button class="variant-ghost-surface px-2 py-1 text-red-600">Disable Email Authentication</Button>
                    {:else}
                        <Button class="variant-filled-primary px-2 py-1">Enable Email Authentication</Button>
                    {/if}
                </div>
            {/if}
        </div>
    </div>
</div>


