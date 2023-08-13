import * as restify from 'restify';
import { Router } from 'restify-router';
const router = new Router();

router.group('/oauth2', (router: Router) => {
    router.post('/authorize', (req: restify.Request, res: restify.Response, next: restify.Next) => {
        return next();
    });

    router.post('/token', (req: restify.Request, res: restify.Response, next: restify.Next) => {
        return next();
    });
});

export default router;
