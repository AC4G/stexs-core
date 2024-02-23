import type { Writable } from 'svelte/store';
import { stexs } from '../../stexsClient';
import type { ToastSettings } from '@skeletonlabs/skeleton';
import type { Profile } from '$lib/stores/profileStore';

export async function acceptOrganizationRequest(
  userId: string,
  organizationId: number,
  organizationName: string,
  role: string,
  flash: Writable<ToastSettings>,
  profileStore: Writable<Profile | null>,
): Promise<boolean> {
  let isMember: boolean = false;
  const { error } = await stexs.from('organization_members').insert([
    {
      member_id: userId,
      organization_id: organizationId,
      role,
    },
  ]);

  if (error) {
    flash.set({
      message: `Could not join ${organizationName} organization. Try out again.`,
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
      message: `You are now member of ${organizationName} organization.`,
      classes: 'variant-glass-success',
      timeout: 5000,
    });
    isMember = true;
  }

  return isMember;
}

export async function deleteOrganizationRequest(
  userId: string,
  organizationId: number,
  flash: Writable<ToastSettings>,
): Promise<boolean> {
  let isDeleted: boolean = false;
  const { error } = await stexs
    .from('organization_requests')
    .delete()
    .eq('addressee_id', userId)
    .eq('organization_id', organizationId);

  if (error) {
    flash.set({
      message: `Could not delete organization request. Try out again.`,
      classes: 'variant-glass-error',
      timeout: 5000,
    });
  } else {
    flash.set({
      message: `Organization request successfuly deleted.`,
      classes: 'variant-glass-success',
      timeout: 5000,
    });
    isDeleted = true;
  }

  return isDeleted
}
