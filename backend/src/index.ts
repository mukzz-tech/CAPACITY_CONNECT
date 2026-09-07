import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/authRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import assessmentRoutes from './routes/assessmentRoutes.js';
import certificateRoutes from './routes/certificateRoutes.js';
import proctoringRoutes from './routes/proctoringRoutes.js';
import chatbotRoutes from './routes/chatbotRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import ttsRoutes from './routes/ttsRoutes.js';
import voiceRoutes from './routes/voiceRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middleware
app.use(helmet({
  crossOriginResourcePolicy: false, // Permit media streaming to frontend
}));

app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173', process.env.CLIENT_URL || ''],
  credentials: true,
}));

// Request Logging
app.use(morgan('dev'));

// Body Parsers
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// General Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' },
});
app.use('/api', globalLimiter);

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    service: 'Capacity Connect API — SIH 2026 PS #26075',
    timestamp: new Date().toISOString(),
  });
});

// Route Handlers
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/proctoring', proctoringRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tts', ttsRoutes);
app.use('/api/voice', voiceRoutes);

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: `Endpoint ${req.method} ${req.originalUrl} not found.` });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`Capacity Connect Backend API running on port ${PORT}`);
  console.log(`Target: Ministry of Earth Sciences / IMD Training Portal`);
  console.log(`=======================================================`);
});

export default app;
