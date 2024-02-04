<script lang="ts">
	import { Sidebar, SidebarGroup, SidebarItem, SidebarWrapper, SidebarDropdownWrapper, SidebarDropdownItem } from 'flowbite-svelte';
	import Icon from '@iconify/svelte';
		
	const activeClass = 'flex items-center p-2 rounded-md  variant-glass-primary text-primary-500 pointer-events-none';
	const nonActiveClass = 'flex items-center p-2 text-white rounded-md';
	const btnClass = 'flex items-center p-2 w-full rounded-md transition duration-75 text-white group hover:!bg-surface-500';

	export let activeUrl;
</script>

<Sidebar class="w-full" {activeUrl} {activeClass} {nonActiveClass}>
	<SidebarWrapper class="flex flex-col justify-between h-full !bg-transparent">
	  	<SidebarGroup>
			<SidebarItem label="Profile" href="/settings" class="hover:!bg-surface-500">
				<svelte:fragment slot="icon">
					<Icon icon="octicon:person-16" />
				</svelte:fragment>
			</SidebarItem>
			<SidebarItem label="Account" href="/settings/account" class="hover:!bg-surface-500">
				<svelte:fragment slot="icon">
					<Icon icon="octicon:gear-16" />
				</svelte:fragment>
			</SidebarItem>
			<SidebarItem label="Notifications" href="/settings/notifications" class="hover:!bg-surface-500">
				<svelte:fragment slot="icon">
					<Icon icon="mdi:bell-outline" />
				</svelte:fragment>
			</SidebarItem>
			<SidebarItem label="Applications" href="/settings/apps" class="hover:!bg-surface-500">
				<svelte:fragment slot="icon">
					<Icon icon="octicon:apps-16" />
				</svelte:fragment>
			</SidebarItem>
			<SidebarDropdownWrapper label="Billing" {btnClass}>
				<svelte:fragment slot="icon">
					<Icon icon="octicon:credit-card-16" />
				</svelte:fragment>
				<SidebarItem label="Invoices" href="/settings/invoices" class="hover:!bg-surface-500 ps-11" />
				<SidebarItem label="Payment information" href="/settings/payment" class="hover:!bg-surface-500 ps-11" />
			</SidebarDropdownWrapper>
		</SidebarGroup>
	</SidebarWrapper>
</Sidebar>
