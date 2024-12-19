import { stexs } from '../../stexsClient';
import type { Profile } from '$lib/stores/profileStore';
import { setToast, type GenericResult } from 'ui';

export async function acceptProjectRequest(
	userId: string,
	projectId: number,
	projectName: string,
	organizationName: string,
	role: string,
	$profileStore: Profile,
): Promise<GenericResult> {
	const { error } = await stexs.from('project_members').insert([
		{
			member_id: userId,
			project_id: projectId,
			role,
		},
	]);

	if (error) {
		setToast({
			title: 'Error',
			type: 'error',
			description: `Could not join ${projectName} project from ${organizationName} organization. Try out again.`,
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
		description: `You are now member of ${projectName} project from ${organizationName} organization.`,
		duration: 5000,
	});

	return {
		success: true
	};
}

export async function deleteProjectRequest(
	userId: string,
	projectId: number,
): Promise<GenericResult> {
	const { error } = await stexs
		.from('project_requests')
		.delete()
		.eq('addressee_id', userId)
		.eq('project_id', projectId);

	if (error) {
		setToast({
			title: 'Error',
			type: 'error',
			description: `Could not delete project request. Try out again.`,
			duration: 5000,
		});

		return {
			success: false
		};
	}

	setToast({
		title: 'Success',
		type: 'success',
		description: `Project request successfuly deleted.`,
		duration: 5000,
	});

	return {
		success: true
	};
}
