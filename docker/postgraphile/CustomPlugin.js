const { makeExtendSchemaPlugin, gql, embed } = require("graphile-utils");

const friendRequestsTopicFromContext = async (_args, context, _resolveInfo) => {
  if (context.jwtClaims && context.jwtClaims.sub) {
    return `graphql:friend_requests:${context.jwtClaims.sub}`;
  } else {
    throw new Error("Invalid JWT");
  }
};

const organizationJoinRequestsTopicFromContext = async (_args, context, _resolveInfo) => {
  if (context.jwtClaims && context.jwtClaims.sub) {
    return `graphql:org_requests:${context.jwtClaims.sub}`;
  } else {
    throw new Error("Invalid JWT");
  }
};

const projectJoinRequestsTopicFromContext = async (_args, context, _resolveInfo) => {
  if (context.jwtClaims && context.jwtClaims.sub) {
    return `graphql:project_requests:${context.jwtClaims.sub}`;
  } else {
    throw new Error("Invalid JWT");
  }
};

const triggerOnInitEvent = async () => {
  return {};
}

module.exports = makeExtendSchemaPlugin(({ pgSql: sql }) => ({
  typeDefs: gql`
    type FriendRequestSubscriptionPayload {
      friendRequests: [FriendRequest]
      event: String
    }

    type OrganizationJoinRequestSubscriptionPayload {
      organizationRequests: [OrganizationRequest],
      event: String
    }

    type ProjectJoinRequestSubscriptionPayload {
      projectRequests: [ProjectRequest],
      event: String
    }

    extend type Subscription {
      friendRequestChanged: FriendRequestSubscriptionPayload @pgSubscription(topic: ${embed(
        friendRequestsTopicFromContext
      )}, initialEvent: ${embed(
        triggerOnInitEvent
      )}),
      organizationJoinRequestChanged: OrganizationJoinRequestSubscriptionPayload @pgSubscription(topic: ${embed(
        organizationJoinRequestsTopicFromContext
      )}, initialEvent: ${embed(
        triggerOnInitEvent
      )}),
      projectJoinRequestChanged: ProjectJoinRequestSubscriptionPayload @pgSubscription(topic: ${embed(
        projectJoinRequestsTopicFromContext
      )}, initialEvent: ${embed(
        triggerOnInitEvent
      )})
    }
  `,

  resolvers: {
    FriendRequestSubscriptionPayload: {
      async friendRequests(
        event,
        _args,
        _context,
        { graphile: { selectGraphQLResultFromTable } }
      ) {
        const rows = await selectGraphQLResultFromTable(
          sql.fragment`public.friend_requests`,
          (tableAlias, sqlBuilder) => {
            sqlBuilder.where(
              sql.fragment`${tableAlias}.addressee_id = ${sql.value(_context.jwtClaims.sub)}`
            );
          }
        );
        return rows;
      }
    },
    OrganizationJoinRequestSubscriptionPayload: {
      async organizationRequests(
        event,
        _args,
        _context,
        { graphile: { selectGraphQLResultFromTable } }
      ) {
        const rows = await selectGraphQLResultFromTable(
          sql.fragment`public.organization_requests`,
          (tableAlias, sqlBuilder) => {
            sqlBuilder.where(
              sql.fragment`${tableAlias}.addressee_id = ${sql.value(_context.jwtClaims.sub)}`
            );
          }
        );
        return rows;
      }
    },
    ProjectJoinRequestSubscriptionPayload: {
      async projectRequests(
        event,
        _args,
        _context,
        { graphile: { selectGraphQLResultFromTable } }
      ) {
        const rows = await selectGraphQLResultFromTable(
          sql.fragment`public.project_requests`,
          (tableAlias, sqlBuilder) => {
            sqlBuilder.where(
              sql.fragment`${tableAlias}.addressee_id = ${sql.value(_context.jwtClaims.sub)}`
            );
          }
        );
        return rows;
      }
    }
  },
}));
