import { Router } from "express";
import avatarsRouter from './avatars';
import itemsRouter from './items';
import organizationRouter from './organizations';
import projectsRouter from './projects';

const storageRouter = Router();

storageRouter.use('/avatars', avatarsRouter);
storageRouter.use('/items', itemsRouter);
storageRouter.use('/organizations', organizationRouter);
storageRouter.use('/projects', projectsRouter);

export default storageRouter;
