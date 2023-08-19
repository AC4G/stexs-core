import { Router, Request, Response } from 'express';
const router = Router();

router.post('/authorize', (req: Request, res: Response) => {
    res.send({});
});

router.post('/token', (req: Request, res: Response) => {
    res.send({});
});

export default router;
