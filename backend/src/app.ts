import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { apiRouter } from './routes/index.js';
import { errorHandler, notFound } from './middleware/error-handler.js';

export const app = express();

app.disable('x-powered-by');
app.use(cors({ origin: new URL(env.FRONTEND_URL).origin, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use('/api', apiRouter);
app.use(notFound);
app.use(errorHandler);
