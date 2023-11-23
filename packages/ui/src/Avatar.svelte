<script lang="ts">
    import { Avatar } from '@skeletonlabs/skeleton';
    import { onMount } from 'svelte';

    const parser = new DOMParser();

    export let styles: string;
    export let userId: string;
    export let username: string;
    export let endpoint: string;

    let key: string;

    onMount(async () => {
        const response = await fetch(`${endpoint}/avatars/?list-type=2&prefix=${userId}`);
        key = (parser.parseFromString(await response.text(), 'application/xml')).querySelector('Contents > Key').textContent;
    });
</script>

<Avatar src={key && `${endpoint}/avatars/${key}`} initials={username} class={styles} />
