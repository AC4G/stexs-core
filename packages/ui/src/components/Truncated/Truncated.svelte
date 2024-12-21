<script lang="ts">
	interface Props {
		text: string;
		maxLength?: number;
	}

	let { 
		text, 
		maxLength = 10, 
		...rest 
	}: Props = $props();

	function truncateUsername(text, maxLength) {
		return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
	}
</script>

<p {...rest}>{truncateUsername(text, maxLength)}</p>
