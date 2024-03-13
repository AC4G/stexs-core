<script lang="ts">
    import type { SvelteComponent } from 'svelte';
    import { getModalStore } from '@skeletonlabs/skeleton';
    import MFA from '../MFA.svelte';
    import { superForm, superValidateSync } from 'sveltekit-superforms/client';
    import { EmailChange, VerifyEmailChange } from 'validation-schemas';
    import Input from '../Input.svelte';
    import Button from '../Button.svelte';
    
    export let parent: SvelteComponent;

    const modalStore = getModalStore();

    let stexs = $modalStore[0].meta.stexs;
    let flash = $modalStore[0].meta.flash;
    let types = $modalStore[0].meta.types;
    let type = types.length === 1 && types[0];
    let currentEmail: string = $modalStore[0].meta.email;
    let newEmailEntered: boolean = false;
    let mfaEntered: boolean = false;
    let confirmErrors: string[] = [];
    const requestCodeTypes = ['email'];

    const { form, errors, validate } = superForm(superValidateSync(EmailChange), {
        id: 'email-change',
        validators: EmailChange,
        validationMethod: 'oninput',
        clearOnSubmit: 'none',
    });

    const { form: verifyForm, errors: verifyErrors, validate: verifyValidate } = superForm(superValidateSync(VerifyEmailChange), {
        id: 'verify-email-change',
        validators: VerifyEmailChange,
        validationMethod: 'oninput',
        clearOnSubmit: 'none',
    });

    async function submit() {
        const result = await validate();

        if (!result.valid || $errors._errors) return;

        if (currentEmail === $form.email) {
            $errors._errors = ['New email cannot be the same as current email.'];
            return;
        }

        if (requestCodeTypes.includes(type)) stexs.auth.mfa.requestCode(type);

        newEmailEntered = true;
    }

    async function verify() {
        const result = await verifyValidate();

        if (!result.valid) return;

        const response = await stexs.auth.verifyEmailChange($verifyForm.code);

        if (response.ok) {
            $flash = {
                message: 'Email successfully changed.',
                classes: 'variant-glass-success',
                timeout: 5000,
            }
            cancel();
            return;
        }

        const body = await response.json();

        if (body.errors[0].code === 'CODE_EXPIRED') {
            newEmailEntered = false;
            mfaEntered = false;

            $errors._errors = [body.errors[0].message];

            return;
        }

        body.errors.forEach((error: { message: string }) => {
            $verifyErrors._errors === undefined
                ? ($verifyErrors._errors = [error.message])
                : $verifyErrors._errors.push(error.message);
            return;
        });
    }

    async function confirmMFA(code: string) {
        const response = await stexs.auth.changeEmail($form.email, code, type);

        if (response.ok) {
            mfaEntered = true;
            return;
        }

        const updateErrors = (await response.json()).errors;

        if (updateErrors[0].code === 'EMAIL_NOT_AVAILABLE') {
            updateErrors.forEach((error: { message: string }) => {
                $errors._errors = [error.message];
                return;
            });
            newEmailEntered = false;
            return;
        }

        confirmErrors = updateErrors;
    }

    function jumpToVerification() {
        newEmailEntered = true;
        mfaEntered = true;
    }

    const cancel = () => modalStore.close();

    $: $verifyForm.code = $verifyForm.code.toUpperCase();
</script>

{#if $modalStore[0]}
    {#if newEmailEntered}
        {#if mfaEntered}
            <div class="card p-5 space-y-6 flex flex-col relative max-w-[380px]">
                <div class="h-fit">
                    <p class="text-[22px] text-primary-500">Verify Email Change</p>
                </div>
                {#if $verifyErrors._errors && Array.isArray($verifyErrors._errors)}
                    <ul class="whitespace-normal text-[14px] text-error-400 text-center">
                        {#each $verifyErrors._errors as error (error)}
                            <li>{error}</li>
                        {/each}
                    </ul>
                {/if}
                <Input
                    name="code"
                    field="code"
                    required
                    bind:value={$verifyForm.code}
                >Code</Input>
                <div class="flex justify-between w-full">
                    <Button class="variant-ringed-surface hover:bg-surface-600" on:click={cancel}>Cancel</Button>
                    <Button on:click={verify} class="variant-filled-primary">Verify</Button>
                </div>
            </div>
        {:else}
            <MFA {stexs} {flash} {types} {cancel} confirm={confirmMFA} {confirmErrors} bind:type />
        {/if}
    {:else}
        <div class="card p-5 space-y-6 flex flex-col relative max-w-[380px]">
            <div class="h-fit">
                <p class="text-[22px] text-primary-500">Email Change</p>
            </div>
            {#if $errors._errors && Array.isArray($errors._errors)}
                <ul class="whitespace-normal text-[14px] text-error-400 text-center">
                    {#each $errors._errors as error (error)}
                        <li>{error}</li>
                    {/each}
                </ul>
            {/if}
            <Input
                name="email"
                type="email"
                field="email"
                required
                bind:value={$form.email}
            >New Email</Input>
            <Button on:click={jumpToVerification} class="p-0 text-secondary-500 hover:text-secondary-400 w-fit">Already email changed?</Button>
            <div class="flex justify-between w-full">
                <Button class="variant-ringed-surface hover:bg-surface-600" on:click={cancel}>Cancel</Button>
                <Button on:click={submit} class="variant-filled-primary">Continue</Button>
            </div>
        </div>
    {/if}
{/if}
