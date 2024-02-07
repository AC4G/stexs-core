const { makeExtendSchemaPlugin, gql, embed } = require("graphile-utils");

const notificationsTopicFromContext = async (_args, context, _resolveInfo) => {
  if (context.jwtClaims && context.jwtClaims.sub) {
    return `graphql:notifications:${context.jwtClaims.sub}`;
  } else {
    throw new Error("Invalid JWT");
  }
};

const triggerOnInitEvent = async () => {
  return {};
}

module.exports = makeExtendSchemaPlugin(({ pgSql: sql }) => ({
  typeDefs: gql`
    type NotificationsSubscriptionPayload {
      unseenNotifications: Int
    }

    extend type Subscription {
      notificationsChanged: NotificationsSubscriptionPayload @pgSubscription(
        topic: ${embed(notificationsTopicFromContext)},
        initialEvent: ${embed(triggerOnInitEvent)}
      )
    }
  `,
  resolvers: {
    NotificationsSubscriptionPayload: {
      async unseenNotifications(
        event,
        _args,
        _context,
        _resolveInfo
      ) {
        const { rows } = await _context.pgClient.query(`
          SELECT COUNT(*)
          FROM public.notifications
          WHERE user_id = $1::uuid AND
            seen = FALSE;
        `, [_context.jwtClaims.sub]);
      
        return rows[0].count;
      }
    },
  },
}));
