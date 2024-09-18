<script lang="ts">
	import { Sidebar, SidebarGroup, SidebarItem, SidebarWrapper, SidebarDropdownWrapper, SidebarDropdownItem } from 'flowbite-svelte';
	import Icon from '@iconify/svelte';
		
	export let activeClass: string;
	export let nonActiveClass: string;
	export let btnClass: string;

	export let activeUrl;
</script>

<Sidebar class="w-full" {activeUrl} {activeClass} {nonActiveClass}>
	<SidebarWrapper class="flex flex-col justify-between h-full !bg-transparent">
	  	<SidebarGroup>
			<SidebarItem label="Profile" href="/settings">
				<svelte:fragment slot="icon">
					<Icon icon="octicon:person-16" />
				</svelte:fragment>
			</SidebarItem>
			<SidebarItem label="Security" href="/settings/security">
				<svelte:fragment slot="icon">
					<Icon icon="mdi:security-lock" />
				</svelte:fragment>
			</SidebarItem>
			<SidebarItem label="Applications" href="/settings/apps">
				<svelte:fragment slot="icon">
					<Icon icon="octicon:apps-16" />
				</svelte:fragment>
			</SidebarItem>
			<SidebarDropdownWrapper label="Billing" {btnClass}>
				<svelte:fragment slot="icon">
					<Icon icon="octicon:credit-card-16" />
				</svelte:fragment>
				<SidebarItem label="Invoices" href="/settings/invoices" class="ps-11" />
				<SidebarItem label="Payment information" href="/settings/payment" class="ps-11" />
			</SidebarDropdownWrapper>
		</SidebarGroup>
	</SidebarWrapper>
</Sidebar>
