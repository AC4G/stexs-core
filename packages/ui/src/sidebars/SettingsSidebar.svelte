<script lang="ts">
	import {
		Sidebar,
		SidebarGroup,
		SidebarItem,	
		SidebarDropdownWrapper,
	} from 'svelte-5-ui-lib';
	import Icon from '@iconify/svelte';


	interface Props {
		activeClass?: string;
		nonActiveClass?: string;
		btnClass?: string;
		activeUrl?: any;
	}

	let {
		activeClass,
		nonActiveClass,
		btnClass,
		activeUrl
	}: Props = $props();
</script>

<Sidebar class="w-full" {activeUrl} {activeClass} {nonActiveClass}>
	<SidebarGroup>
		<SidebarItem label="Profile" href="/settings">
			{#snippet iconSlot()}
				<Icon icon="octicon:person-16" />
			{/snippet}
		</SidebarItem>
		<SidebarItem label="Security" href="/settings/security">
			{#snippet iconSlot()}
				<Icon icon="mdi:security-lock" />
			{/snippet}
		</SidebarItem>
		<SidebarItem label="Connections" href="/settings/connections">
			{#snippet iconSlot()}
				<Icon icon="ep:connection" />
			{/snippet}
		</SidebarItem>
		<SidebarDropdownWrapper label="Billing" {btnClass}>
			{#snippet iconSlot()}
				<Icon icon="octicon:credit-card-16" />
			{/snippet}
			<SidebarItem label="Invoices" href="/settings/invoices" class="ps-11" />
			<SidebarItem
				label="Payment information"
				href="/settings/payment"
				class="ps-11"
			/>
		</SidebarDropdownWrapper>
	</SidebarGroup>
</Sidebar>
