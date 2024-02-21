<script lang="ts">
    import { onMount, type SvelteComponent } from 'svelte';
    import { getModalStore } from '@skeletonlabs/skeleton';
    import formatJSON from '../utils/jsonFormater';
    import Icon from "@iconify/svelte";
    import Button from '../Button.svelte';
    import ItemThumbnail from '../ItemThumbnail.svelte';
    import ProjectLogo from '../ProjectLogo.svelte';

    export let parent: SvelteComponent;

    let loading: boolean = true;
    const modalStore = getModalStore();
    let data = $modalStore[0].meta.data;
    let stexs = $modalStore[0].meta.stexsClient;

    onMount(async () => {
        const additionalData = await $modalStore[0].meta.fn;

        data = { 
            ...data,
            ...additionalData,
            items: {
                ...data.items,
                ...additionalData.items,
                projects: {
                    ...data.items.projects,
                    ...additionalData.items.projects
                }
            }
        };
        loading = false;
    });
</script>

{#if $modalStore[0]}
    <div class="card p-5 flex flex-col max-w-[380px] w-full relative">
        <div class="absolute right-[8px] top-[8px]">
            <Button on:click={parent.onClose} class="p-2 variant-ghost-surface">
                <Icon icon="ph:x-bold" />
            </Button>
        </div>
        <div class="space-y-6">
            <ItemThumbnail {stexs} itemId={data.items.id} itemName={data.items.name} />
            {#if loading}
                <div class="space-y-6">
                    <div class="placeholder animate-pulse h-[24px] max-w-[280px]" />
                    <div class="flex flex-row space-x-2">
                        <div class="placeholder animate-pulse w-[48px] h-[48px]" />
                        <div class="flex flex-col space-y-2 w-[180px]">
                            <div class="placeholder animate-pulse h-[20px]" />
                            <div class="placeholder animate-pulse h-[20px]" />
                        </div>
                    </div>
                    <div class="placeholder animate-pulse h-[24px] max-w-[200px]" />
                    <div class="placeholder animate-pulse h-[80px] w-full" />
                    <div class="placeholder animate-pulse h-[100px] w-full" />
                    <div class="placeholder animate-pulse h-[24px] max-w-[220px]" />
                </div>
            {:else}
                <a href="/items/{data.items.id}" class="text-[24px] hover:text-secondary-400 transition">{data.items.name}</a>
                <div class="flex flex-row space-x-2">
                    <a href="/organizations/{data.items.projects.organizations.name}/{data.items.projects.name}">
                        <div class="w-[48px] h-[48px] bg-surface-600 transition border border-gray-600 rounded-md inline-flex items-center justify-center text-center">
                            <ProjectLogo {stexs} projectId={data.items.projects.id} alt={data.items.projects.name} class="rounded-md" />
                        </div>
                    </a>
                    <div class="flex flex-col">
                        <a href="/organizations/{data.items.projects.organizations.name}/{data.items.projects.name}" class="text-[14px] text-gray-500 hover:text-secondary-400 transition">{data.items.projects.name}</a>
                        <a href="/organizations/{data.items.projects.organizations.name}" class="text-[14px] text-gray-500 hover:text-secondary-400 transition">{data.items.projects.organizations.name}</a>
                    </div>
                </div>
                {#if data.amount !== null}
                    <p class="text-[18px]">Amount: {data.amount}</p>
                {/if}
                {#if data.items.description}
                    <p class="text-[16px]">{data.items.description}</p>
                {/if}
                {#if Object.entries(data.parameter).length > 0}
                    <div class="space-y-1">
                        <p class="text-[18px]">Parameter:</p>
                        <pre class="pre text-[14px] max-h-[300px] whitespace-pre">{@html formatJSON(data.parameter)}</pre>
                    </div>
                {/if}
                <p class="text-[18px]">Last modified: {data.updated_at ? new Date(data.updated_at).toLocaleString() : '-'}</p>
            {/if}
        </div>
    </div>
{/if}
