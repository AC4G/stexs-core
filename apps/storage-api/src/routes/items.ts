import {
	ACCESS_TOKEN_SECRET,
	AUDIENCE,
	BUCKET,
	ISSUER,
} from '../../env-config';
import { Router, Response } from 'express';
import {
	checkTokenGrantType,
	transformJwtErrorMessages,
	validateAccessToken,
} from 'utils-node/jwtMiddleware';
import logger from '../loggers/logger';
import { Request } from 'express-jwt';
import db from '../database';
import { errorMessages } from 'utils-node/messageBuilder';
import {
	INTERNAL_ERROR,
	ITEM_ID_NOT_NUMERIC,
	ITEM_ID_REQUIRED,
	UNAUTHORIZED_ACCESS,
} from 'utils-node/errors';
import s3 from '../s3';
import { param } from 'express-validator';
import validate from 'utils-node/validatorMiddleware';
import { checkScopes } from '../middlewares/scopes';

const router = Router();

router.get(
	'/thumbnail/:itemId',
	[
		param('itemId')
			.notEmpty()
			.withMessage(ITEM_ID_REQUIRED)
			.bail()
			.isNumeric()
			.withMessage(ITEM_ID_NOT_NUMERIC),
		validate(logger),
	],
	async (req: Request, res: Response) => {
		const { itemId } = req.params;

		const time = 60 * 60 * 24; // 1 day

		const signedUrl = await s3.getSignedUrl('getObject', {
			Bucket: BUCKET,
			Key: `items/thumbnails/${itemId}`,
			Expires: time,
		});

		logger.info(`Generated new presigned url for item thumbnail: ${itemId}`);

		return res.json({
			url: signedUrl,
		});
	},
);

router.post(
	'/thumbnail/:itemId',
	[
		validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
		checkTokenGrantType(['password', 'client_credentials']),
		checkScopes(['item.thumbnail.write']),
		transformJwtErrorMessages(logger),
		param('itemId')
			.notEmpty()
			.withMessage(ITEM_ID_REQUIRED)
			.bail()
			.isNumeric()
			.withMessage(ITEM_ID_NOT_NUMERIC),
		validate(logger),
	],
	async (req: Request, res: Response) => {
		const sub = req.auth?.sub;
		const { itemId } = req.params;
		const grantType = req.auth?.grant_type;
		const clientId = req.auth?.client_id;
		const organizationId = req.auth?.organization_id;

		try {
			let isAllowed = false;

			if (grantType === 'password') {
				const { rowCount } = await db.query(
					`
            SELECT 1
            FROM public.project_members AS pm
            JOIN public.profiles AS p ON pm.member_id = p.user_id
            JOIN public.items AS i ON pm.project_id = i.project_id
            WHERE i.id = $1::integer 
              AND pm.member_id = $2::uuid 
              AND pm.role IN ('Admin', 'Owner');
          `,
					[itemId, sub],
				);

				if (rowCount) isAllowed = true;
			} else {
				const { rowCount } = await db.query(
					`
            SELECT 1
            FROM public.items AS i
            JOIN public.projects AS p ON p.id = i.project_id
            JOIN public.oauth2_apps AS oa ON oa.client_id = $3::uuid
            JOIN public.organizations AS o ON o.id = p.organization_id
            WHERE i.id = $1::integer
              AND (
                oa.project_id = i.project_id OR
                oa.project_id IS NULL
              )
              AND o.id = $2::integer;
          `,
					[itemId, organizationId, clientId],
				);

				if (rowCount) isAllowed = true;
			}

			if (!isAllowed) {
				const consumer = grantType === 'password' ? 'User' : 'Client';
				const consumerId = grantType === 'password' ? sub : clientId;

				logger.warn(
					`${consumer} is not authorized to upload/update the thumbnail of an item: ${itemId}. ${consumer}: ${consumerId}`,
				);

				return res
					.status(401)
					.json(errorMessages([{ info: UNAUTHORIZED_ACCESS }]));
			}
		} catch (e) {
			logger.error(
				`Error while checking the current user if authorized for uploading/updating item thumbnail. Error: ${
					e instanceof Error ? e.message : e
				}`,
			);
			return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
		}

		const signedPost = await s3.createPresignedPost({
			Bucket: BUCKET,
			Fields: {
				key: 'items/thumbnails/' + itemId,
				'Content-Type': `image/webp`,
			},
			Conditions: [
				['content-length-range', 0, 1024 * 1024],
				['eq', '$Content-Type', `image/webp`],
			],
			Expires: 60 * 5, // 5 minutes
		});

		logger.info(`Created signed post url for item thumbnail: ${itemId}`);

		return res.json(signedPost);
	},
);

export default router;
