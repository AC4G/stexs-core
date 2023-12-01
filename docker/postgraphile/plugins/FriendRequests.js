const { makeExtendSchemaPlugin, gql, embed } = require("graphile-utils");

const friendRequestsTopicFromContext = async (_args, context, _resolveInfo) => {
  if (context.jwtClaims.sub) {
    return `graphql:friend_requests:${context.jwtClaims.sub}`;
  } else {
    throw new Error("You're not logged in");
  }
};

module.exports = makeExtendSchemaPlugin(({ pgSql: sql }) => ({
  typeDefs: gql`
    type FriendRequestSubscriptionPayload {
      friendRequests: [FriendRequest]
      event: String
    }

    extend type Subscription {
      friendRequestChanged: FriendRequestSubscriptionPayload @pgSubscription(topic: ${embed(
        friendRequestsTopicFromContext
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
              sql.fragment`${tableAlias}.addressee_id = ${sql.value(context.jwtClaims.sub)}`
            );
          }
        );
        return rows;
      },
    },
  },
}));
