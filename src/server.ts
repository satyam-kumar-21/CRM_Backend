import dotenv from 'dotenv';
// Load environment variables immediately before importing anything else
dotenv.config();

import app from './app';
import { connectDB } from './config/db';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`[Server] Enterprise CRM Engine active on port ${PORT}`);
  });
};

startServer();