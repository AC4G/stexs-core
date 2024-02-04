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
    input NotificationFilters {
      type: String
      seen: Boolean
      friend_request_id: Int
      organization_request_id: Int
      project_request_id: Int
    }

    input Pagination {
      limit: Int
      offset: Int
    }

    type NotificationsSubscriptionPayload {
      notifications(
        filters: NotificationFilters
        pagination: Pagination
      ): [Notification]
      event: String
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
      async notifications(
        event,
        _args,
        _context,
        { graphile: { selectGraphQLResultFromTable } }
      ) {
        const limit =_args. pagination?.limit;
        const offset = _args.pagination?.offset;

        const filters = _args.filters;

        const rows = await selectGraphQLResultFromTable(
          sql.fragment`public.notifications`,
          (tableAlias, sqlBuilder) => {
            sqlBuilder.where(
              sql.fragment`${tableAlias}.user_id = ${sql.value(_context.jwtClaims.sub)}`
            );

            sqlBuilder.orderBy(
              sql.fragment`${tableAlias}.id`,
              'desc'
            );

            if (filters) {
              Object.entries(filters).forEach(([key, value]) => {
                sqlBuilder.where(sql.fragment`${sql.identifier(key)} = ${sql.value(value)}`);
              });
            }
    
            if (limit !== undefined) {
              sqlBuilder.limit(limit);
            }

            if (offset !== undefined) {
              sqlBuilder.offset(offset);
            }
          },
        );

        return rows;
      },
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
