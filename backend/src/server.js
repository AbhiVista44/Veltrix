import 'dotenv/config';
import mongoose from 'mongoose';
import app from './app.js';
import { connectDB } from './config/db.js';
import { getJwtSecret, isAuthEnabled } from './middleware/authMiddleware.js';

const PORT = Number(process.env.PORT) || 5000;

let server;

const startServer = async () => {
  try {
    if (isAuthEnabled()) {
      getJwtSecret();
    }

    await connectDB();
    server = app.listen(PORT, () => {
      console.log(
        `Veltrix API listening on port ${PORT} (auth=${isAuthEnabled() ? 'enabled' : 'disabled'})`
      );
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

const shutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await mongoose.connection.close();
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

startServer();
