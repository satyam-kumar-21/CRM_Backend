import dotenv from 'dotenv';
// Load environment variables immediately before importing anything else
dotenv.config();

import app from './app';
import { connectDB } from './config/db';
import { createServer } from 'http';
import { configureSocket } from './realtime/socket';

const PORT: number = Number(process.env.PORT) || 5000;
const HOST = '0.0.0.0';

const startServer = async () => {
  await connectDB();

  const server = createServer(app);
  configureSocket(server);
  server.listen(PORT, HOST, () => {
    console.log(`[Server] Enterprise CRM Engine active on port ${PORT}`);
  });
};

startServer();