import { Router, Response } from 'express';
import logger from '../loggers/logger';
import { Request } from 'express-jwt';
import validate from 'utils-ts/validatorMiddleware';
import { param } from 'express-validator';
import { INTERNAL_ERROR, PROJECT_ID_NOT_NUMERIC, PROJECT_ID_REQUIRED, PROJECT_NOT_FOUND, UNAUTHORIZED_ACCESS } from 'utils-ts/errors';
import redis from '../redis';
import db from '../database';
import { errorMessages } from 'utils-ts/messageBuilder';
import { ACCESS_TOKEN_SECRET, AUDIENCE, BUCKET, ISSUER } from '../../env-config';
import s3 from '../s3';
import { checkTokenGrantType, transformJwtErrorMessages, validateAccessToken } from 'utils-ts/jwtMiddleware';

const router = Router();

router.get(
    '/:projectId',
    [
        param('projectId')
            .notEmpty()
            .withMessage(PROJECT_ID_REQUIRED)
            .bail()
            .isNumeric()
            .withMessage(PROJECT_ID_NOT_NUMERIC),
        validate(logger)
    ],
    async (req: Request, res: Response) => {
        const { projectId } = req.params;

        const url = await redis.get(`projects:${projectId}`);

        if (url) {
            logger.info(`Project picture presigned url fetched from cache: ${projectId}`);
            return res.json({ url });
        }

        try {
            const { rowCount } = await db.query(
                `
                    SELECT 1
                    FROM public.projects
                    WHERE id = $1::integer;
                `,
                [projectId]
            );
        
            if (rowCount === 0) {
                logger.warn(`Project not found for project id: ${projectId}`);
                return res.status(404).json(
                    errorMessages([
                        {
                            info: PROJECT_NOT_FOUND,
                            data: {
                            location: 'params',
                            path: 'projectId',
                            },
                        },
                    ]),
                );
            }
        } catch (e) {
            logger.error(
                `Error while checking project for existence: ${projectId}. Error: Error: ${
                    e instanceof Error ? e.message : e
                }`,
            );
            return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
        }  

        const time = 60 * 60 * 24 * 7; // 7 days in seconds

        const signedUrl = await s3.getSignedUrl('getObject', {
            Bucket: BUCKET,
            Key: `projects/${projectId}`,
            Expires: time
        });
        
        logger.info(`Generated new presigned url for project: ${projectId}`);
        
        try {
            await redis.set(`projects:${projectId}`, signedUrl, {
                EX: time - 10
            });
        } catch (e) {
            logger.error(
                `Error while setting signed url for project into cache. Project id: ${projectId}. Error: Error: ${
                    e instanceof Error ? e.message : e
                }`,
            );
        }
        
        return res.json({
            url: signedUrl
        });
});

router.post(
    '/:projectId',
    [
        validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
        checkTokenGrantType([
            'password',
            //'client_credentials'
        ]),
        transformJwtErrorMessages(logger),
        param('projectId')
            .notEmpty()
            .withMessage(PROJECT_ID_REQUIRED)
            .bail()
            .isNumeric()
            .withMessage(PROJECT_ID_NOT_NUMERIC),
        validate(logger)
    ],
    async (req: Request, res: Response) => {
      const userId = req.auth?.sub!;
      const { projectId } = req.params;
  
      try {
        const { rowCount } = await db.query(
            `
                SELECT 1
                FROM public.project_members
                WHERE member_id = $1::uuid AND project_id = $2::integer AND role IN ('Admin', 'Editor', 'Owner');
            `,
            [userId, projectId],
        );
  
        if (rowCount === 0) {
            logger.error(
                `User is not authorized to upload/update the logo of the given project: ${projectId}. User: ${userId}`,
            );
            return res
                .status(401)
                .json(errorMessages([{ info: UNAUTHORIZED_ACCESS }]));
        }
      } catch (e) {
        logger.error(
            `Error while checking the current user if authorized for uploading/updating project logo. Error: Error: ${
                e instanceof Error ? e.message : e
            }`,
        );
        return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
      }
  
      const signedPost = await s3.createPresignedPost({
        Bucket: BUCKET,
        Fields: {
            key: 'projects/' + projectId,
            'Content-Type': `image/webp`,
        },
        Conditions: [
            ['content-length-range', 0, 1024 * 1024],
            ['eq', '$Content-Type', `image/webp`],
        ],
        Expires: 60,
      });
  
      logger.info(`Created signed post url for project logo: ${projectId}`);
  
      return res.json(signedPost);
    },
);

router.delete(
    '/:projectId',
    [
        validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
        checkTokenGrantType([
            'password',
            //'client_credentials'
        ]),
        transformJwtErrorMessages(logger),
        param('projectId')
            .notEmpty()
            .withMessage(PROJECT_ID_REQUIRED)
            .bail()
            .isNumeric()
            .withMessage(PROJECT_ID_NOT_NUMERIC),
        validate(logger)
    ],
    async (req: Request, res: Response) => {
        const userId = req.auth?.sub!;
        const { projectId } = req.params;

        try {
            const { rowCount } = await db.query(
                `
                    SELECT 1
                    FROM public.project_members
                    WHERE member_id = $1::uuid AND project_id = $2::integer AND role IN ('Admin', 'Editor', 'Owner');
                `,
                [userId, projectId],
            );
      
            if (rowCount === 0) {
                logger.error(
                    `User is not authorized to delete the logo of the given project: ${projectId}. User: ${userId}`,
                );
                return res
                    .status(401)
                    .json(errorMessages([{ info: UNAUTHORIZED_ACCESS }]));
            }
        } catch (e) {
            logger.error(
                `Error while checking the current user if authorized for deleting project logo. Error: Error: ${
                    e instanceof Error ? e.message : e
                }`,
            );
            return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
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

            logger.info(`Deleted project logo from project: ${projectId}`);
        } catch (e) {
            logger.error(
                `Error while fetching list of objects or delete object in avatars bucket. Error: Error: ${
                e instanceof Error ? e.message : e
                }`,
            );
            return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
        }

        return res.status(204).json();
});

export default router;
