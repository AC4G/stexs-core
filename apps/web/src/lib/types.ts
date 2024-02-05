export type MFAMethod = {
  icon: string;
  description: string;
};

export type NotificationsGQL = {
  notificationsChanged:  {
    unseenNotifications: number
  }
};

export type Friend = {
  profiles: {
    user_id: string;
    username: string;
  };
};
