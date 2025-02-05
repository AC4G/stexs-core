import { Router, Response } from 'express';
import logger from '../../loggers/logger';
import { Request } from 'express-jwt';
import { param } from 'express-validator';
import {
	INTERNAL_ERROR,
	PROJECT_ID_NOT_NUMERIC,
	PROJECT_ID_REQUIRED,
	UNAUTHORIZED_ACCESS,
} from 'utils-node/errors';
import db from '../../db';
import { message } from 'utils-node/messageBuilder';
import {
	ACCESS_TOKEN_SECRET,
	AUDIENCE,
	BUCKET,
	ISSUER,
} from '../../../env-config';
import s3 from '../../s3';
import {
	validate,
	checkScopes,
	checkTokenGrantType,
	transformJwtErrorMessages,
	validateAccessToken,
} from 'utils-node/middlewares';
import { QueryConfig } from 'pg';

const router = Router();

const checkProjectOwnerUserQuery: QueryConfig = {
	text: `
		SELECT 1
		FROM public.project_members AS pm
		WHERE pm.member_id = $1::uuid 
			AND pm.project_id = $2::integer 
			AND pm.role IN ('Admin', 'Owner');
	`,
	name: 'storage-api-check-project-owner-user'
};
const checkProjectOwnerClientQuery: QueryConfig = {
	text: `
		SELECT 1
		FROM public.projects AS p
		JOIN public.oauth2_apps AS oa ON oa.client_id = $3::uuid
		WHERE pm.organization_id = $1::integer 
			AND (
				oa.project_id = $2::integer OR
				oa.project_id IS NULL
			)
			AND p.id = $2::integer;
	`,
	name: 'storage-api-check-project-owner-client'
}

router.get(
	'/:projectId',
	[
		param('projectId')
			.notEmpty()
			.withMessage(PROJECT_ID_REQUIRED)
			.bail()
			.isNumeric()
			.withMessage(PROJECT_ID_NOT_NUMERIC),
		validate(logger),
	],
	async (req: Request, res: Response) => {
		const { projectId } = req.params;

		const time = 60 * 60 * 24; // 1 day

		const signedUrl = await s3.getSignedUrl('getObject', {
			Bucket: BUCKET,
			Key: `projects/${projectId}`,
			Expires: time,
		});

		logger.debug(`Generated new presigned url for project logo: ${projectId}`);

		return res.json(message('Presigned url generated successfully.', {
			url: signedUrl,
		}));
	},
);

router.post(
	'/:projectId',
	[
		param('projectId')
			.notEmpty()
			.withMessage(PROJECT_ID_REQUIRED)
			.bail()
			.isNumeric()
			.withMessage(PROJECT_ID_NOT_NUMERIC),
		validate(logger),
		validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
		checkTokenGrantType(['password', 'client_credentials']),
		checkScopes(['project.logo.write'], db, logger),
		transformJwtErrorMessages(logger),
	],
	async (req: Request, res: Response) => {
		const sub = req.auth?.sub!;
		const { projectId } = req.params;
		const {
			grant_type: grantType,
			client_id: clientId,
			organization_id: organizationId,			
		} = req.auth as {
			grant_type: string;
			client_id: string;
			organization_id: number;
		};

		try {
			let isAllowed = false;

			if (grantType === 'password') {
				const { rowCount } = await db.query(
					checkProjectOwnerUserQuery,
					[sub, projectId],
				);

				if (rowCount === 1) isAllowed = true;
			} else {
				const { rowCount } = await db.query(
					checkProjectOwnerClientQuery,
					[organizationId, projectId, clientId],
				);

				if (rowCount === 1) isAllowed = true;
			}

			if (!isAllowed) {
				const consumer = grantType === 'password' ? 'User' : 'Client';
				const consumerId = grantType === 'password' ? sub : clientId;

				logger.debug(`${consumer} is not authorized to upload/update the logo of the given project: ${projectId}. ${consumer}: ${consumerId}`);

				return res
					.status(401)
					.json(
						message(
							'Unauthorized access to upload/update the logo of the given project.',
							{},
							[{ info: UNAUTHORIZED_ACCESS }]
						)
					);
			}
		} catch (e) {
			logger.error(
				`Error while checking the current user if authorized for uploading/updating project logo. Error: ${
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
				key: 'projects/' + projectId,
				'Content-Type': `image/webp`,
				'Cache-Control': `private, max-age=${cacheExpires}, must-revalidate`,
				'Content-Disposition': `attachment; filename="project-${projectId}.webp"`,
			},
			Conditions: [
				['content-length-range', 0, 1024 * 1024], // 1MB
				['eq', '$Cache-Control', `private, max-age=${cacheExpires}, must-revalidate`],
				['eq', '$Content-Type', `image/webp`],
				['eq', '$key', 'projects/' + projectId],
				['eq', '$Content-Disposition', `attachment; filename="project-${projectId}.webp"`]
			],
			Expires: 60 * 5, // 5 minutes
		});

		logger.debug(`Created signed post url for project logo: ${projectId}`);

		return res.json(message('Presigned url generated successfully.', { ...signedPost }));
	},
);

router.delete(
	'/:projectId',
	[
		param('projectId')
			.notEmpty()
			.withMessage(PROJECT_ID_REQUIRED)
			.bail()
			.isNumeric()
			.withMessage(PROJECT_ID_NOT_NUMERIC),
		validate(logger),
		validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
		checkTokenGrantType(['password', 'client_credentials']),
		checkScopes(['project.logo.delete'], db, logger),
		transformJwtErrorMessages(logger),
	],
	async (req: Request, res: Response) => {
		const sub = req.auth?.sub!;
		const { projectId } = req.params;
		const grantType = req.auth?.grant_type;
		const clientId = req.auth?.client_id;
		const organizationId = req.auth?.organization_id;

		try {
			let rowsFound = false;

			if (grantType === 'password') {
				const { rowCount } = await db.query(
					checkProjectOwnerUserQuery,
					[sub, projectId],
				);

				if (rowCount === 1) rowsFound = true;
			} else {
				const { rowCount } = await db.query(
					checkProjectOwnerClientQuery,
					[organizationId, projectId, clientId],
				);

				if (rowCount === 1) rowsFound = true;
			}

			if (!rowsFound) {
				const consumer = grantType === 'password' ? 'User' : 'Client';
				const consumerId = grantType === 'password' ? sub : clientId;

				logger.debug(`${consumer} is not authorized to delete the logo of the given project: ${projectId}. ${consumer}: ${consumerId}`);

				return res
					.status(401)
					.json(
						message(
							'Unauthorized access to delete the logo of the given project.',
							{},
							[{ info: UNAUTHORIZED_ACCESS }]
						)
					);
			}
		} catch (e) {
			logger.error(
				`Error while checking the current user if authorized for deleting project logo. Error: ${
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
						Objects: [{ Key: 'projects/' + projectId }],
					},
				})
				.promise();

			logger.debug(`Deleted logo from project: ${projectId}`);

			res.sendStatus(204);
		} catch (e) {
			logger.error(
				`Error while deleting project logo. Error: ${
					e instanceof Error ? e.message : e
				}`,
			);
			res
				.status(500)
				.json(
					message(
						'An unexpected error occurred while deleting project logo.',
						{},
						[{ info: INTERNAL_ERROR }]
					)
				);
		}
	},
);

export default router;
