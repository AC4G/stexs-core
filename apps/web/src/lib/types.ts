export type MFAMethod = {
  icon: string;
  description: string;
};

export type FriendRequestsGQL = {
  friendRequestChanged: {
    friendRequests: Array<{
      id: number;
      profileByRequesterId: {
        userId: string;
        username: string;
      };
    }>;
  };
};

export type FriendRequests = Array<{
  id: number;
  profileByRequesterId: {
    userId: string;
    username: string;
  };
}>;

export type Friend = {
  profiles: {
    user_id: string;
    username: string;
  };
};
