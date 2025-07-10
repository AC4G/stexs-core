import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import responseTime from 'response-time';
import cors from 'cors';
import router from './routes/router';
import debugMiddleware from './middlewares/debugMiddleware';
import requestLoggerMiddleware from './middlewares/requestLogger';
import notFoundMiddleware from './middlewares/notFoundMiddleware';
import errorHandlerMiddleware from './middlewares/errorHandlerMiddleware';

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(cors());
app.use(responseTime());
app.use(debugMiddleware());
app.use(requestLoggerMiddleware());
app.use('/', router);
app.use(notFoundMiddleware());
app.use(errorHandlerMiddleware());

export default app;
