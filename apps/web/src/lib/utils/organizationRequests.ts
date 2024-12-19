import { stexs } from '../../stexsClient';
import type { Profile } from '$lib/stores/profileStore';
import { setToast, type GenericResult } from 'ui';

export async function acceptOrganizationRequest(
	userId: string,
	organizationId: number,
	organizationName: string,
	role: string,
	$profileStore: Profile,
): Promise<GenericResult> {
	const { error } = await stexs.from('organization_members').insert([
		{
			member_id: userId,
			organization_id: organizationId,
			role,
		},
	]);

	if (error) {
		setToast({
			title: 'Error',
			type: 'error',
			description: `Could not join ${organizationName} organization. Try out again.`,
			duration: 5000,
		});

		return {
			success: false
		};
	}

	if ($profileStore.refetchOrganizationsFn) {
		$profileStore.refetchOrganizationsFn();
	}

	setToast({
		title: 'Success',
		type: 'success',
		description: `You are now member of ${organizationName} organization.`,
		duration: 5000,
	});

	return {
		success: true
	};
}

export async function deleteOrganizationRequest(
	userId: string,
	organizationId: number,
): Promise<GenericResult> {
	const { error } = await stexs
		.from('organization_requests')
		.delete()
		.eq('addressee_id', userId)
		.eq('organization_id', organizationId);

	if (error) {
		setToast({
			title: 'Error',
			type: 'error',
			description: `Could not delete organization request. Try out again.`,
			duration: 5000,
		});

		return {
			success: false
		};
	}
	
	setToast({
		title: 'Success',
		type: 'success',
		description: `Organization request successfuly deleted.`,
		duration: 5000,
	});

	return {
		success: true
	};
}
