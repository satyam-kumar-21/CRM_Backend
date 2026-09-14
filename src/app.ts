import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'node:path';
// import { apiRateLimiter } from './middlewares/rateLimiter';
import { errorHandler } from './middlewares/errorMiddleware';
import companyRoutes from './routes/companyRoutes';
import aiAutomationRoutes from './routes/aiAutomationRoutes';

const uploadRoot = path.resolve(process.cwd(), 'uploads');
const app: Application = express();
app.set('etag', false);

// Security Middlewares
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000')
        .split(',')
        .map((url) => url.trim())
        .filter(Boolean);

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin not allowed by CORS'));
    },
    credentials: true,
  })
);

// Standard Middlewares
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/uploads', express.static(uploadRoot));
// app.use('/api', apiRateLimiter);
app.use('/api/v1/company', companyRoutes);
app.use('/api/v1/ai', aiAutomationRoutes);

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Global Error Handler
app.use(errorHandler);

export default app;