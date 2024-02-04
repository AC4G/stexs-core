import type { ModalSettings } from '@skeletonlabs/skeleton';
import type {
  Invalidator,
  Subscriber,
  Unsubscriber,
  Updater,
} from 'svelte/store';

export type MFAMethod = {
  icon: string;
  description: string;
};

export type NotificationsGQL = {
  notificationsChanged:  {
    notifications: Notifications
    unseenNotifications: number
  }
};

export type Notifications = Array<{
  id: number;
  userId: string;
  message: string | null;
  type: 'notification' | 'friend_request' | 'organization_request' | 'project_request';
  seen: boolean;
  friendRequestByFriendRequestId: FriendRequest;
  organizationRequestByOrganizationRequestId: OrganizationRequest;
  projectRequestByProjectRequestId: ProjectRequest;
}>;

type FriendRequest = {
  profileByRequesterId: {
    userId: string;
    username: string;
  };
};

type OrganizationRequest = {
  role: string;
  organizationByOrganizationId: {
    id: number;
    name: string;
  };
};

type ProjectRequest = {
  role: string;
  projectByProjectId: {
    id: number;
    name: string;
    organizationByOrganizationId: {
      name: string;
    };
  };
};

export type Friend = {
  profiles: {
    user_id: string;
    username: string;
  };
};
