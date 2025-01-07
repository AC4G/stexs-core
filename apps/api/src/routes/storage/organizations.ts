import { Router, Response } from 'express';
import logger from '../../loggers/logger';
import { Request } from 'express-jwt';
import { param } from 'express-validator';
import {
	INTERNAL_ERROR,
	ORGANIZATION_ID_NOT_NUMERIC,
	ORGANIZATION_ID_REQUIRED,
	UNAUTHORIZED_ACCESS,
} from 'utils-node/errors';
import {
	validate,
	checkScopes,
	checkTokenGrantType,
	transformJwtErrorMessages,
	validateAccessToken,
} from 'utils-node/middlewares';
import {
	ACCESS_TOKEN_SECRET,
	AUDIENCE,
	BUCKET,
	ISSUER,
} from '../../../env-config';
import db from '../../db';
import { message } from 'utils-node/messageBuilder';
import s3 from '../../s3';
import { QueryConfig } from 'pg';

const router = Router();

const checkOrganizationOwnerUserQuery: QueryConfig = {
	text: `
		SELECT 1
		FROM public.organization_members
		WHERE member_id = $1::uuid 
			AND organization_id = $2::integer 
			AND role IN ('Admin', 'Owner');
	`,
	name: 'storage-api-check-organization-owner-user'
};

router.get(
	'/:organizationId',
	[
		param('organizationId')
			.notEmpty()
			.withMessage(ORGANIZATION_ID_REQUIRED)
			.bail()
			.isNumeric()
			.withMessage(ORGANIZATION_ID_NOT_NUMERIC),
		validate(logger),
	],
	async (req: Request, res: Response) => {
		const { organizationId } = req.params;

		const time = 60 * 60 * 24; // 1 day

		const signedUrl = await s3.getSignedUrl('getObject', {
			Bucket: BUCKET,
			Key: `organizations/${organizationId}`,
			Expires: time,
		});

		logger.debug(`Generated new presigned url for organization logo: ${organizationId}`);

		return res.json(message('Presigned url generated successfully.', {
			url: signedUrl,
		}));
	},
);

router.post(
	'/:organizationId',
	[
		param('organizationId')
			.notEmpty()
			.withMessage(ORGANIZATION_ID_REQUIRED)
			.bail()
			.isNumeric()
			.withMessage(ORGANIZATION_ID_NOT_NUMERIC),
		validate(logger),
		validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
		checkTokenGrantType(['password', 'client_credentials']),
		checkScopes(['organization.logo.write'], db, logger),
		transformJwtErrorMessages(logger),
	],
	async (req: Request, res: Response) => {
		const sub = req.auth?.sub!;
		const organizationId = parseInt(req.params.organizationId);
		const {
			grant_type: grantType,
			client_id: clientId,
			organization_id: organizationIdFromToken,
		} = req.auth as {
			grant_type: string;
			client_id: string;
			organization_id: number;
		};

		try {
			let isAllowed = false;

			if (grantType === 'password') {
				const { rowCount } = await db.query(
					checkOrganizationOwnerUserQuery,
					[sub, organizationId],
				);

				if (rowCount === 1) isAllowed = true;
			} 
			
			if (organizationId === organizationIdFromToken) {
				isAllowed = true;
			}

			if (!isAllowed) {
				const consumer = grantType === 'password' ? 'User' : 'Client';
				const consumerId = grantType === 'password' ? sub : clientId;

				logger.debug(`${consumer} is not authorized to upload/update the logo of the given organization: ${organizationId}. ${consumer}: ${consumerId}`);

				return res
					.status(401)
					.json(
						message(
							'Unauthorized access to upload/update the logo of the given organization.',
							{},
							[{ info: UNAUTHORIZED_ACCESS }]
						)
					);
			}
		} catch (e) {
			logger.error(
				`Error while checking the current user if authorized for uploading/updating organization logo. Error: ${
					e instanceof Error ? e.message : e
				}`,
			);
			return res
				.status(500)
				.json(
					message(
						'An unexpected error occurred while checking authorization.',
						{},
						[{ info: INTERNAL_ERROR }]
					)
				);
		}

		const cacheExpires = 60 * 60 * 24 * 7; // 1 week

		const signedPost = await s3.createPresignedPost({
			Bucket: BUCKET,
			Fields: {
				key: 'organizations/' + organizationId,
				'Content-Type': `image/webp`,
				'Cache-Control': `private, max-age=${cacheExpires}, must-revalidate`,
				'Content-Disposition': `attachment; filename="organization-${organizationId}.webp"`,
			},
			Conditions: [
				['content-length-range', 0, 1024 * 1024], // 1MB
				['eq', '$Cache-Control', `private, max-age=${cacheExpires}, must-revalidate`],
				['eq', '$Content-Type', `image/webp`],
				['eq', '$key', 'organizations/' + organizationId],
				['eq', '$Content-Disposition', `attachment; filename="organization-${organizationId}.webp"`]
			],
			Expires: 60 * 5, // 5 minutes
		});

		logger.debug(`Created presigned post url for organization logo: ${organizationId}`);

		return res.json(message('Presigned post url generated successfully.', { ...signedPost }));
	},
);

router.delete(
	'/:organizationId',
	[
		param('organizationId')
			.notEmpty()
			.withMessage(ORGANIZATION_ID_REQUIRED)
			.bail()
			.isNumeric()
			.withMessage(ORGANIZATION_ID_NOT_NUMERIC),
		validate(logger),
		validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
		checkTokenGrantType(['password', 'client_credentials']),
		checkScopes(['organization.logo.delete'], db, logger),
		transformJwtErrorMessages(logger),
	],
	async (req: Request, res: Response) => {
		const sub = req.auth?.sub!;
		const organizationId = parseInt(req.params.organizationId);
		const {
			grant_type: grantType,
			client_id: clientId,
			organization_id: organizationIdFromToken,
		} = req.auth as {
			grant_type: string;
			client_id: string;
			organization_id: number;
		};

		try {
			let isAllowed = false;

			if (grantType === 'password') {
				const { rowCount } = await db.query(
					checkOrganizationOwnerUserQuery,
					[sub, organizationId],
				);

				if (rowCount) isAllowed = true;
			}
			
			if (organizationId === organizationIdFromToken) isAllowed = true;

			if (!isAllowed) {
				const consumer = grantType === 'password' ? 'User' : 'Client';
				const consumerId = grantType === 'password' ? sub : clientId;

				logger.debug(`${consumer} is not authorized to delete the logo of the given organization: ${organizationId}. ${consumer}: ${consumerId}`);
				return res
					.status(401)
					.json(
						message(
							'Unauthorized access to delete the logo of the given organization.',
							{},
							[{ info: UNAUTHORIZED_ACCESS }]
						)
					);
			}
		} catch (e) {
			logger.error(
				`Error while checking the current user if authorized for deleting organization logo. Error: ${
					e instanceof Error ? e.message : e
				}`,
			);
			return res
				.status(500)
				.json(
					message(
						'An unexpected error occurred while checking authorization.',
						{},
						[{ info: INTERNAL_ERROR }]
					)
				);
		}

		try {
			await s3
				.deleteObjects({
					Bucket: BUCKET,
					Delete: {
						Objects: [{ Key: 'organizations/' + organizationId }],
					},
				})
				.promise();

			logger.debug(`Deleted logo from organization: ${organizationId}`);

			res.sendStatus(204);
		} catch (e) {
			logger.error(
				`Error while deleting organization logo. Error: ${
					e instanceof Error ? e.message : e
				}`,
			);
			res
				.status(500)
				.json(
					message(
						'An unexpected error occurred while deleting organization logo.',
						{},
						[{ info: INTERNAL_ERROR }]
					)
				);
		}
	},
);

export default router;
