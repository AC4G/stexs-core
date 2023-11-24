<script lang="ts">
    export let text: string;
    export let maxLength: number = 10;

    function truncateUsername(text, maxLength) {
        return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
    }
</script>

<p {...$$restProps}>{truncateUsername(text, maxLength)}</p>
