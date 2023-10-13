import { 
	NextFunction, 
	Router,
	Request,
	Response
} from 'express';
import specs from '../../swagger.json';

const router = Router();

router.get('', (req: Request, res: Response, next: NextFunction) => {
	res.json(specs);

	return next();
});

export default router;
