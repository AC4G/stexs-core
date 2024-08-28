<script lang="ts">
    import { onMount, type SvelteComponent } from 'svelte';
    import { getModalStore } from '@skeletonlabs/skeleton';
    import Button from '../Button.svelte';
    import Input from '../Input.svelte';
    import QR from '@svelte-put/qr/img/QR.svelte';
    import { VerifyCode } from 'validation-schemas';
    import { superForm, superValidateSync } from 'sveltekit-superforms/client';
    import { tick } from "svelte";

    export let parent: SvelteComponent;

    const modalStore = getModalStore();

    let submitted = false;
    let codeInput: HTMLInputElement;

    let authQueryStore = $modalStore[0].meta.authQueryStore;
    let stexs = $modalStore[0].meta.stexs;
    let flash = $modalStore[0].meta.flash;

    const { form, errors, validate } = superForm(superValidateSync(VerifyCode), {
        validators: VerifyCode,
        validationMethod: 'oninput',
        clearOnSubmit: 'none',
    });
    
    async function submit() {
        const result = await validate();

        if (!result.valid) return;

        submitted = true;

        const response = await stexs.auth.mfa.verify('totp', $form.code);

        if (response.ok) {
            $flash = {
                message: 'Authenticator app method successfully enabled.',
                classes: 'variant-glass-success',
                timeout: 5000,
            }
            authQueryStore.refetch();
            modalStore.close();
            return;
        }
        
        const verificationErrors = (await response.json()).errors;

        verificationErrors.forEach((error: { message: string }) => {
            $errors._errors === undefined
                ? ($errors._errors = [error.message])
                : $errors._errors.push(error.message);
        });

        submitted = false;
    }

    function copied() {
        $flash = {
            message: 'Copied to clipboard', 
            classes: 'variant-glass-success', 
            timeout: 1000
        };
    }

    function toggleShowSecret() {
        showSecret = !showSecret;
    }

    const cancel = () => modalStore.close();

    let totp;
    let showSecret: boolean = false;
    
    onMount(async () => { 
        let response = await stexs.auth.mfa.enable('totp');

        if (!response.ok) {
            $flash = {
                message: 'Failed to initialize TOTP. Please try again.',
                classes: 'variant-glass-error',
                timeout: 5000
            };
            
            cancel();
        }

        totp = await response.json();

        await tick();

        codeInput.focus();
    })

    $: secretHidden = totp && totp.secret.slice(0, 4) + '***' + totp.secret.slice(-4);
</script>

{#if $modalStore[0]}
    <div class="card p-5 space-y-6 flex flex-col relative max-w-[380px] w-full">
        <div class="h-fit">
            <p class="text-[22px] text-primary-500">Authenticator App</p>
        </div>
        {#if totp}
            <div class="space-y-4 flex flex-col items-center">
                <QR
                    data={totp.otp_auth_uri}
                    shape="circle"
                    anchorInnerFill="gray"
                    anchorOuterFill="gray"
                    moduleFill="gray"
                    width="260"
                    height="260"
                    draggable="false"
                />
                <p class="text-center">Scan the QR code above with your authenticator app and enter the generated code below.</p>
                <p class="text-center">Unable to scan the QR code?</p>
                <div class="flex space-x-2 items-center border border-surface-500 rounded-md p-2 max-w-[380px]">
                    <p class="text-center px-2 py-1 rounded-md break-all">{#if showSecret}{totp.secret}{:else}{secretHidden}{/if}</p>
                    <Button on:click={toggleShowSecret} class="variant-ghost-surface px-2 py-1 h-fit">
                        {#if showSecret}Hide{:else}Show{/if}
                    </Button>
                </div>
                <Button clipboardData={totp.secret} on:click={copied} class="btn variant-ghost-secondary w-fit px-2 py-1">Copy Secret</Button>
            </div>
            {#if $errors._errors && Array.isArray($errors._errors)}
                <ul class="whitespace-normal text-[14px] text-error-400 text-center">
                    {#each $errors._errors as error (error)}
                        <li>{error}</li>
                    {/each}
                </ul>
            {/if}
            <form
                class="space-y-6"
                autocomplete="off"
                on:submit|preventDefault={submit}
            >
                <Input
                    name="code"
                    field="code"
                    required
                    bind:value={$form.code}
                    bind:ref={codeInput}
                >Code</Input>
                {#if $errors.code && Array.isArray($errors.code)}
                    <ul class="whitespace-normal text-[14px] mt-2 text-error-400">
                    {#each $errors.code as error (error)}
                        <li>{error}</li>
                    {/each}
                    </ul>
                {/if}
                <div class="flex justify-between w-full">
                    <Button class="variant-ringed-surface hover:bg-surface-600" on:click={cancel}>Cancel</Button>
                    <Button on:click={submit} class="variant-filled-primary">Enable</Button>
                </div>
            </form>
        {:else}
            <div class="space-y-4 flex flex-col items-center">
                <div class="w-full max-w-[260px] h-[260px] placeholder animate-pulse" />
                <div class="w-full max-w-[340px] h-[60px] placeholder animate-pulse" />
                <div class="w-full max-w-[200px] h-[40px] placeholder animate-pulse" />
                <div class="w-full max-w-[200px] h-[40px] placeholder animate-pulse" />
                <div class="w-full max-w-[100px] h-[40px] placeholder animate-pulse" />
            </div>
            <div class="w-full max-w-[340px] h-[70px] placeholder animate-pulse" />
            <div class="flex justify-between w-full">
                <Button class="variant-ringed-surface hover:bg-surface-600" on:click={cancel}>Cancel</Button>
                <div class="w-[88px] h-[42px] placeholder animate-pulse" />
            </div>
        {/if}
    </div>
{/if}
