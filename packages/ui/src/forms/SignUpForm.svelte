<script lang="ts">
	import { setToast } from '../utils/toast';
    import { zod } from 'sveltekit-superforms/adapters';
    import { SignUp } from 'validation-schemas';
	import { superForm } from 'sveltekit-superforms/client';
    import FormErrors from '../components/Form/FormErrors.svelte';
    import Input from '../components/Input/Input.svelte';
    import lodash from 'lodash';
    import type StexsClient from 'stexs-client';
	import FormSubmit from '../components/Form/FormSubmit.svelte';

	const { debounce } = lodash;

    interface Props {
        stexs: StexsClient;
    }

    let { stexs }: Props = $props();

    let formData = $state({
		username: '',
		email: '',
		password: '',
		confirm: '',
		terms: false
	});
	let submitted: boolean = $state(false);

    const { form, errors, validateForm } = superForm(formData, {
		dataType: 'json',
		validators: zod(SignUp),
		validationMethod: 'oninput',
		clearOnSubmit: 'none',
	});

	let usernameNotAvailable: boolean = $state(false);
	let checkedUsernames: { username: string; available: boolean }[] = [];

	const checkUsernameAvailability: any = debounce(async () => {
		if ($errors.username || $form.username.length === 0) return;

		const checkExists = checkedUsernames.find(
			(check) => check.username === $form.username.toLocaleLowerCase(),
		);

		if (checkExists) {
			if (checkExists.available) {
				usernameNotAvailable = false;
			} else {
				usernameNotAvailable = true;
			}

			return;
		}

		const { count } = await stexs
			.from('profiles')
			.select('', {
				count: 'exact',
				head: true,
			})
			.ilike('username', $form.username);

		let available: boolean = true;

		if (count === 1) {
			usernameNotAvailable = true;
			available = false;
		} else {
			usernameNotAvailable = false;
		}

		checkedUsernames.push({
			username: $form.username.toLocaleLowerCase(),
			available,
		});
	}, 300);

	async function signUp(event: SubmitEvent) {
		event.preventDefault();

		const result = await validateForm();

		if (!result.valid || usernameNotAvailable) return;

		submitted = true;

		const response = await (
			await stexs.auth.signUp($form.username, $form.email, $form.password)
		).json();

		if (response.success) {
			setToast({
				title: 'Success',
				description: response.message,
				type: 'success',
				duration: 10000
			})
			goto('/sign-in');

			return;
		}

		response.errors.forEach(
			(error: { data: { path: string }; message: string }) => {
				const path = error.data.path;

				if (!(path in $errors)) {
					$errors._errors === undefined
						? ($errors._errors = [error.message])
						: $errors._errors.push(error.message);
					return;
				}

				// @ts-ignore
				$errors[path] = $errors[path] || [];
				// @ts-ignore
				if (!$errors[path].includes(error.message)) {
					// @ts-ignore
					$errors[path].push(error.message);
				}
			},
		);

		submitted = false;
	}

	$effect(() => {
		if (usernameNotAvailable && $form.username.length === 0)
			usernameNotAvailable = false;
	});


	function goto(arg0: string) {
		throw new Error('Function not implemented.');
	}
</script>

<FormErrors errors={$errors._errors} />
<form class="space-y-6" onsubmit={signUp}>
    <div>
        <Input
            field="username"
            required
            oninput={checkUsernameAvailability}
            bind:value={$form.username}>Username</Input
        >
        <FormErrors errors={$errors.username}>
            {#if usernameNotAvailable}
                <p class="text-[14px] text-error-400 whitespace-normal">
                    Username is already being used
                </p>
            {/if}
        </FormErrors>
    </div>
    <div>
        <Input field="email" type="email" required bind:value={$form.email}
            >Email</Input
        >
        <FormErrors errors={$errors.email} />
    </div>
    <div>
        <Input
            field="password"
            type="password"
            required
            bind:value={$form.password}>Password</Input
        >
        <FormErrors errors={$errors.password} />
    </div>
    <div>
        <Input
            field="confirm"
            type="password"
            required
            bind:value={$form.confirm}>Confirm Password</Input
        >
        <FormErrors errors={$errors.confirm} />
    </div>
    <Input
        field="terms"
        labelClass="flex items-center space-x-2"
        labelAfter={true}
        inputClass="checkbox"
        type="checkbox"
        required
        bind:checked={$form.terms}
    >
        I agree to <a
            href="/terms-and-conditions"
            class="text-secondary-500 hover:text-secondary-400 transition"
            >Terms and Conditions</a
        >
    </Input>
	<FormSubmit 
		submitText="Sign Up" 
		{submitted} 
		submitOnly 
	/>
</form>
