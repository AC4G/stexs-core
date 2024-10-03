import Icon from '@iconify/svelte';
import { type TreeViewNode } from '@skeletonlabs/skeleton';

export const scopesTreeViewNodes: TreeViewNode[] = [
	//profile
	{
		id: 'profile',
		content: 'Profile',
		lead: Icon,
		leadProps: {
			icon: 'octicon:person-16',
			width: '18',
		},
		children: [
			{
				id: 'profile.read',
				content: 'View Your Profile',
			},
		],
	},

	//friends
	{
		id: 'friends',
		content: 'Friends',
		lead: Icon,
		leadProps: {
			icon: 'octicon:people-16',
			width: '18',
		},
		children: [
			{
				id: 'friend.read',
				content: 'View Your Friend List',
			},
			{
				id: 'friend.delete',
				content: 'Remove Friends from Your Friend List',
			},
			{
				id: 'friend.requests.read',
				content: 'View Friend Requests',
			},
			{
				id: 'friend.write',
				content: 'Accept Friend Requests',
			},
			{
				id: 'friend.requests.write',
				content: 'Send Friend Requests',
			},
			{
				id: 'friend.requests.delete',
				content: 'Cancel Your Friend Requests',
			},
		],
	},

	//inventory
	{
		id: 'inventory',
		content: 'Inventory',
		lead: Icon,
		leadProps: {
			icon: 'ph:backpack',
			width: '18',
		},
		children: [
			{
				id: 'inventory.read',
				content: 'View Your Inventory',
			},
			{
				id: 'inventory.write',
				content: 'Add its own Items to Your Inventory',
			},
			{
				id: 'inventory.update',
				content: 'Update Items in Your Inventory',
			},
			{
				id: 'inventory.delete',
				content: 'Remove Items from Your Inventory',
			},
		],
	},

	//blocking
	{
		id: 'blocking',
		content: 'Blocked Users',
		lead: Icon,
		leadProps: {
			icon: 'fluent-mdl2:block-contact',
			width: '18',
		},
		children: [
			{
				id: 'blocked.read',
				content: 'View Your Blocked Users List',
			},
			{
				id: 'blocked.write',
				content: 'Add Users to Your Blocked List',
			},
			{
				id: 'blocked.delete',
				content: 'Remove Users from Your Blocked List',
			},
		],
	},

	//connections
	{
		id: 'connections',
		content: 'Connections',
		lead: Icon,
		leadProps: {
			icon: 'hugeicons:connect',
			width: '18',
		},
		children: [
			{
				id: 'connection.read',
				content: 'View All Your Connections from the Same Organization',
			},
			{
				id: 'connection.scopes.read',
				content:
					'View Connection Privileges for All Your Connections from the Same Organization',
			},
		],
	},
];
