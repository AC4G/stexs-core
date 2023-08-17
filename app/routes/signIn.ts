import { Router, Request, Response } from 'express';
const router = Router();

router.post('/signIn', (req: Request, res: Response) => {
    return res.send({});
});

export default router;
