<script lang="ts">
    import { getModalStore } from "@skeletonlabs/skeleton";
    import { SvelteComponent } from "svelte";
    import Button from "../Button.svelte";
    import Icon from "@iconify/svelte";
    import { superForm, superValidateSync } from 'sveltekit-superforms/client';
    import { CreateOrganization } from 'validation-schemas';
    import Markdown from "../Markdown.svelte";

    export let parent: SvelteComponent;

    let submitted: boolean = false;
    let preview: boolean = false;

    const modalStore = getModalStore();
    const stexs = $modalStore[0].meta.stexsClient;
    const flash = $modalStore[0].meta.flash;
    const organizationsMemberStore = $modalStore[0].meta.organizationsMemberStore;
    const { form, errors, validate } = superForm(superValidateSync(CreateOrganization), {
        validators: CreateOrganization,
        validationMethod: 'oninput',
        clearOnSubmit: 'none',
    });

    async function createOrganization() {
        const result = await validate();

        if (!result.valid) return;

        submitted = true;

        const cleanedForm = Object.fromEntries(
            Object.entries($form).filter(([key, value]) => value !== null)
        );

        const { error } = await stexs.from('organizations')
            .insert(cleanedForm);
            
        if (error) {
            if (error.code === '23505') {
                $errors['name'] = ['The name has already been taken. Please choose a different one.'];
            } else {
                $errors._errors = [error.message];
            }
        } else {
            flash.set({
                message: `${$form.name} organization was been successfully created.`,
                classes: 'variant-glass-success',
                timeout: 5000,
            });
            organizationsMemberStore.refetch();
            modalStore.close();
        }

        submitted = false;
    }
</script>

{#if $modalStore[0]}
    <div class="card p-3 sm:p-5 space-y-6 flex flex-col max-w-[600px] min-h-[90vh] w-full relative">
        <div>
            <div class="absolute right-[8px] top-[8px]">
                <Button on:click={parent.onClose} class="p-3 variant-ghost-surface">
                    <Icon icon="ph:x-bold" />
                </Button>
            </div>
            <div class="h-fit">
                <p class="text-[22px]">Setup your Organization</p>
            </div>
        </div>
        {#if $errors._errors && Array.isArray($errors._errors)}
            <ul class="whitespace-normal text-[12px] text-error-400 text-center">
            {#each $errors._errors as error (error)}
                <li>{error}</li>
            {/each}
            </ul>
        {/if}
        <form
            class="space-y-6"
            on:submit|preventDefault={createOrganization}
        >
            <label for="name" class="label">
                <span class="flex flex-row gap-x-2">Name<p class="text-red-500">*</p></span>
                <input
                id="name"
                class="input"
                type="text"
                required
                bind:value={$form.name}
                />
            </label>
            {#if $errors.name}
                <p class="whitespace-normal text-[14px] text-error-400">
                    {$errors.name}
                </p>
            {/if}
            <label for="display name" class="label">
                <span>Display Name</span>
                <input
                id="displayName"
                class="input"
                type="text"
                bind:value={$form.display_name}
                />
            </label>
            {#if $errors.display_name}
                <p class="whitespace-normal text-[14px] text-error-400">
                    {$errors.display_name}
                </p>
            {/if}
            <label for="description" class="label">
                <span>Description</span>
                <textarea
                id="description"
                rows="3"
                class="input"
                bind:value={$form.description}
                />
            </label>
            {#if $errors.description}
                <p class="whitespace-normal text-[14px] text-error-400">
                    {$errors.description}
                </p>
            {/if}
            <label for="readme" class="label">
                <span>
                    Readme
                    <button type="button" class="btn px-1 chip variant-ghost-surface" on:click={() => preview = !preview}>Preview</button>
                </span>
                <textarea
                id="readme"
                rows="5"
                class="input"
                bind:value={$form.readme}
                />
                {#if preview && $form.readme && $form.readme.length > 0}
                    <Markdown text={$form.readme} />
                {/if}
            </label>
            {#if $errors.readme}
                <p class="whitespace-normal text-[14px] text-error-400">
                    {$errors.readme}
                </p>
            {/if}
            <label for="email" class="label">
                <span>Email</span>
                <input
                id="email"
                class="input"
                type="text"
                bind:value={$form.email}
                />
            </label>
            {#if $errors.email}
                <p class="whitespace-normal text-[14px] text-error-400">
                    {$errors.email}
                </p>
            {/if}
            <label for="url" class="label">
                <span>Url</span>
                <input
                id="url"
                class="input"
                type="text"
                bind:value={$form.url}
                />
            </label>
            {#if $errors.url}
                <p class="whitespace-normal text-[14px] text-error-400">
                    {$errors.url}
                </p>
            {/if}
            <div class="flex justify-center">
                <Button type="submit" class="variant-filled-primary" {submitted}
                  >Create</Button
                >
              </div>
        </form>
    </div>
{/if}

