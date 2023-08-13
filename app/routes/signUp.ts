import * as restify from 'restify';
import { Router } from 'restify-router';
const router = new Router();

router.post('/signUp', (req: restify.Request, res: restify.Response, next: restify.Next) => {
    
    return next();
});

export default router;