<script lang="ts">
    import Button from '../Button/Button.svelte';

    interface Props {
        containerClass?: string;
        submitOnly?: boolean;
        submitted: boolean;
        cancelText?: string;
        submitText?: string;
        cancelBtnClass?: string;
        submitBtnClass?: string;
        cancel: () => void;
    }

    let {
        containerClass,
        submitOnly = false,
        submitted, 
        cancelText = 'Cancel', 
        submitText = 'Submit', 
        cancelBtnClass,
        submitBtnClass,
        cancel 
    }: Props = $props();

    const containerInitialClass = !submitOnly ? 
        'flex flex-col-reverse space-y-reverse space-y-2 xs:flex-row xs:justify-between xs:space-y-0' 
        : 'justify-center';
</script>

<div class="flex {containerInitialClass} {containerClass}">
    {#if !submitOnly}
        <Button
            class='variant-ghost-surface hover:bg-surface-600 {cancelBtnClass}'
            onclick={cancel}>{cancelText}</Button
        >
    {/if}
    <Button
        type="submit" 
        class='variant-filled-primary {submitBtnClass}'
        {submitted}>{submitText}</Button
    >
</div>
