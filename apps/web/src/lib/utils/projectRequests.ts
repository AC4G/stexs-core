import type { Writable } from 'svelte/store';
import { stexs } from '../../stexsClient';
import type { ToastSettings } from '@skeletonlabs/skeleton';
import type { Profile } from '$lib/stores/profileStore';

export async function acceptProjectRequest(
  userId: string,
  projectId: number,
  projectName: string,
  organizationName: string,
  role: string,
  flash: Writable<ToastSettings>,
  profileStore: Writable<Profile | null>,
): Promise<boolean> {
  let isMember: boolean = false;
  const { error } = await stexs.from('project_members').insert([
    {
      member_id: userId,
      project_id: projectId,
      role,
    },
  ]);

  if (error) {
    flash.set({
      message: `Could not join ${projectName} project from ${organizationName} organization. Try out again.`,
      classes: 'variant-glass-error',
      timeout: 5000,
    });
  } else {
    profileStore.update((profile: Profile | null) => {
      return {
        ...profile!,
        refetchOrganizationsTrigger: !profile?.refetchOrganizationsTrigger,
      };
    });
    flash.set({
      message: `You are now member of ${projectName} project from ${organizationName} organization.`,
      classes: 'variant-glass-success',
      timeout: 5000,
    });
    isMember = true;
  }

  return isMember;
}

export async function deleteProjectRequest(
  userId: string,
  projectId: number,
  flash: Writable<ToastSettings>,
): Promise<boolean> {
  let isDeleted: boolean = false;
  const { error } = await stexs
    .from('project_requests')
    .delete()
    .eq('addressee_id', userId)
    .eq('project_id', projectId);

  if (error) {
    flash.set({
      message: `Could not delete project request. Try out again.`,
      classes: 'variant-glass-error',
      timeout: 5000,
    });
  } else {
    flash.set({
      message: `Project request successfuly deleted.`,
      classes: 'variant-glass-success',
      timeout: 5000,
    });
    isDeleted = true;
  }

  return isDeleted;
}
