export type MFAMethod = {
  icon: string;
  description: string;
};

export type FriendRequestsGQL = {
  friendRequestChanged: {
    friendRequests: Array<{
      profileByRequesterId: {
        userId: string;
        username: string;
      };
    }>;
  };
};

export type FriendRequests = Array<{
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

export type OrganizationRequestsGQL = {
  organizationJoinRequestChanged: {
    organizationRequests: Array<{
      role: string;
      organizationByOrganizationId: {
        id: number;
        name: string;
      };
    }>;
  };
};

export type OrganizationRequests = Array<{
  role: string;
  organizationByOrganizationId: {
    id: number;
    name: string;
  };
}>;

export type ProjectRequestsGQL = {
  projectJoinRequestChanged: {
    projectRequests: Array<{
      projectByProjectId: {
        id: number;
        name: string;
        organizationByOrganizationId: {
          name: string;
        };
      };
    }> | null;
  };
};

export type ProjectRequests = Array<{
  projectByProjectId: {
    id: number;
    name: string;
    organizationByOrganizationId: {
      name: string;
    };
  };
}>;
