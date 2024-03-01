<script lang="ts">
    import { stexs } from "../../stexsClient";
    import { getUserStore } from "$lib/stores/userStore";
    import { Avatar, Input, Button } from "ui";
    import { SlideToggle, type PopupSettings, popup } from "@skeletonlabs/skeleton";
    import { createQuery } from "@tanstack/svelte-query";
    import { getFlash } from "sveltekit-flash-message/client";
    import { page } from "$app/stores";
    import Icon from "@iconify/svelte";
    import { superForm, superValidateSync } from 'sveltekit-superforms/client';
    import { UpdateProfile } from 'validation-schemas';
    import { debounce } from "lodash";

    const userStore = getUserStore();
    const flash = getFlash(page);

    let submitted: boolean = false;
    const { form, errors, validate } = superForm(superValidateSync(UpdateProfile), {
        validators: UpdateProfile,
        validationMethod: 'oninput',
        clearOnSubmit: 'none',
    });
    const checkUsernameAvailability = debounce(async () => {
        if ($errors.username || $form.username === profile.username) return;

        const { count } = await stexs
            .from('profiles')
            .select('', {
                count: 'exact',
                head: true 
            })
            .eq('username', $form.username);

        if (count === 1) {
            $errors.username = [
                'Username is not available'
            ];
        }
    }, 300);
    const profilePrivateInfoPopup: PopupSettings = { 
        event: 'click',
        target: 'profilePrivateInfoPopup',
        placement: 'top'
    };
    const avatarSettingPopup: PopupSettings = {
        event: 'click',
        target: 'avatarSettingPopup',
        placement: 'bottom'
    };

    function updateForm({ username, ...rest } : { username: string }) {
        $form.username = username;
        $form = { ...$form, ...rest };
    }

    const profileQuery = createQuery({
        queryKey: ['settingsProfile'],
        queryFn: async () => {
            const { data } = await stexs
                .from('profiles')
                .select(`
                    username,
                    bio,
                    url,
                    is_private,
                    accept_friend_requests
                `)
                .eq('user_id', $userStore?.id)
                .single();

            updateForm(data);

            return data;
        },
        enabled: !!$userStore
    });

    $: profile = $profileQuery.data;

    async function saveChanges() {
        const result = await validate();

        if (!result.valid || ($errors.username && $errors.username.length === 1)) return;

        const cleanedForm = Object.fromEntries(
            Object.entries($form).filter(([key, value]) => value !== profile[key])
        );

        if (Object.keys(cleanedForm).length === 0) return;

        const { error } = await stexs
            .from('profiles')
            .update(cleanedForm)
            .eq('user_id', $userStore?.id);


        if (error) {
            $flash = {
                message: `Changes couldn't be saved. Please try again.`,
                classes: 'variant-glass-error',
                timeout: 5000,
            };

            return;
        }

        $flash = {
            message: `Changes successfully saved.`,
            classes: 'variant-glass-success',
            timeout: 5000,
        };

        profile = {
            ...profile,
            ...cleanedForm
        };
    }
</script>

<div class="px-[4%] md:px-[8%] grid place-items-center">
    <div class="w-full my-[40px] lg:max-w-[1200px]">
        <div class="space-y-2">
            <h2 class="h2">Profile</h2>
            <hr class="!border-t-2">
        </div>
        {#if $profileQuery.data}
            <div class="grid sm:grid-cols-2 pt-4">
                <div class="relative w-fit h-fit mx-auto ">
                    <Avatar userId={$userStore.id} {stexs} username={$userStore?.username} class="w-[200px] sm:col-start-2 border-2 border-surface-500" draggable="false" />
                    <button use:popup={avatarSettingPopup} class="btn rounded variant-glass-surface p-2 absolute top-36 right-1 border border-surface-500">
                        <Icon icon="octicon:pencil-16" class="text-[18px]" />
                    </button>
                    <div class="p-2 bg-surface-800 border border-surface-600 w-fit max-w-[240px] rounded-md !ml-0" data-popup="avatarSettingPopup">
                        <Button class="hover:!bg-surface-500 p-2 w-full">Upload Avatar</Button>
                        <Button class="hover:!bg-surface-500 p-2 w-full text-red-600">Remove Avatar</Button>
                    </div>
                </div>
                <form class="space-y-6 sm:row-start-1" on:submit|preventDefault={saveChanges}>
                    <div>
                        <Input labelClass="label" bind:value={$form.username} on:input={checkUsernameAvailability}>Username</Input>
                        {#if $errors.username && Array.isArray($errors.username)}
                            <ul class="whitespace-normal text-[14px] mt-2 text-error-400">
                                {#each $errors.username as error (error)}
                                <li>{error}</li>
                                {/each}
                            </ul>
                        {/if}
                    </div>
                    <div>
                        <Input labelClass="label" bind:value={$form.url}>Url</Input>
                        {#if $errors.url && Array.isArray($errors.url)}
                            <ul class="whitespace-normal text-[14px] mt-2 text-error-400">
                                {#each $errors.url as error (error)}
                                <li>{error}</li>
                                {/each}
                            </ul>
                        {/if}
                    </div>
                    <div>
                        <label class="label">
                            <span>Bio</span>
                            <textarea class="input h-[200px]" bind:value={$form.bio}/>
                        </label>
                        {#if $errors.bio}
                            <p class="whitespace-normal text-[14px] mt-2 text-error-400">
                                {$errors.bio}
                            </p>
                        {/if}
                    </div>
                    <div class="flex flex-row justify-between">
                        <div class="flex flex-row items-center space-x-2">
                            <p>Profile Private</p>
                            <button use:popup={profilePrivateInfoPopup} class="btn p-0">
                                <Icon icon="octicon:question-16"/>
                            </button>
                            <div class="p-2 variant-filled-surface w-fit max-w-[240px] rounded-md !ml-0" data-popup="profilePrivateInfoPopup">
                                <p class="text-[14px]">Setting your profile to private will only allow your friends to see your inventory, friends, projects, and organizations. Other members within the projects or organizations will still recognize you as a member.</p>
                            </div>
                        </div>
                        <SlideToggle name="isPrivate" active="bg-primary-500" bind:checked={$form.is_private} size="sm" />
                    </div>
                    <div class="flex flex-row justify-between">
                        <p>Accept Friend Requests</p>
                        <SlideToggle name="acceptFriendRequests" active="bg-primary-500" bind:checked={$form.accept_friend_requests} size="sm" />
                    </div>
                    <div class="w-fit h-fit mx-auto">
                        <Button type="submit" class="variant-filled-primary" {submitted}>Save changes</Button>
                    </div>
                </form>
            </div>
        {/if}
    </div>
</div>
