import * as restify from 'restify';
import { Router } from 'restify-router';
import db from '../database';
import sendEmail from '../services/emailService';
import { message, errorMessage } from '../services/responseBuilder';

const router = new Router();

router.post('/signUp', async (req: restify.Request, res: restify.Response) => {
    const { username, password, email } = req.body;

    const query = `
        INSERT INTO auth.users (email, encrypted_password, raw_user_meta_data)
        VALUES ($1, $2, $3::jsonb)
        RETURNING id;
    `;

    try {
        const result = await db.query(query, [email, password, { username }]);

        res.send(201, 
            message('Sign-up successful. Check your email for confirmation!', { 
                input: req.body,
                output: {
                    userId: result.rows[0].id
                } 
            })
        );
    } catch (error) {
        if (error.hint) {
            return res.send(400,
                errorMessage('INVALID_INPUT_DATA', error.hint, { input: req.body })
            );
        }

        return res.send(400, 
            errorMessage('INVALID_REQUEST', 'Can\'t process the request', { input: req.body })
        );
    }

    await sendEmail(email, 'Confirmation Email', null, 'Please confirm your email.');
});

export default router;