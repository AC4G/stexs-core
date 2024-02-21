import type { Writable } from 'svelte/store';
import { stexs } from '../../stexsClient';
import type { ToastSettings } from '@skeletonlabs/skeleton';
import type { Profile } from '$lib/stores/profileStore';

export async function acceptOrganizationJoinRequest(
  userId: string,
  organizationId: number,
  organizationName: string,
  role: string,
  flash: Writable<ToastSettings>,
  profileStore: Writable<Profile | null>,
) {
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
  }
}

export async function deleteOrganizationJoinRequest(
  userId: string,
  organizationId: number,
  flash: Writable<ToastSettings>,
) {
  const { error } = await stexs
    .from('organization_requests')
    .delete()
    .eq('addressee_id', userId)
    .eq('organization_id', organizationId);

  if (error) {
    flash.set({
      message: `Could not delete organization join request. Try out again.`,
      classes: 'variant-glass-error',
      timeout: 5000,
    });
  } else {
    flash.set({
      message: `Organization join request successfuly deleted.`,
      classes: 'variant-glass-success',
      timeout: 5000,
    });
  }
}
