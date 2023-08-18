import { Router, Request, Response } from 'express';
const router = Router();

router.post('/authorize', (req: Request, res: Response) => {
    return res.send({});
});

router.post('/token', (req: Request, res: Response) => {
    return res.send({});
});

export default router;
