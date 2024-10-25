import Icon from '@iconify/svelte';
import { type TreeViewNode } from '@skeletonlabs/skeleton';

const scopes: { [key: number]: string } = {
	//profile
	9: 'profile.read',

	//friends
	28: 'friend.requests.write',
	29: 'friend.requests.read',
	30: 'friend.requests.delete',
	31: 'friend.read',
	32: 'friend.write',
	33: 'friend.delete',

	//inventory
	5: 'inventory.read',
	6: 'inventory.update',
	7: 'inventory.delete',
	8: 'inventory.write',

	//blocking
	34: 'blocked.read',
	35: 'blocked.write',
	36: 'blocked.delete',

	//connections
	45: 'connection.read',
	46: 'connection.scopes.read'
}

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

export function idsToScopeNames(ids: number[]) {
	return ids.map(id => scopes[id])
		.filter(id => id !== undefined);
}
