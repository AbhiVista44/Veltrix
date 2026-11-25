import mongoose from 'mongoose';

/**
 * Connects to MongoDB using the MONGO_URI environment variable.
 * Never logs credentials or connection strings.
 */
export const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI?.trim();

  if (!mongoUri) {
    throw new Error(
      'MONGO_URI is missing. Add it to backend/.env (see backend/.env.example).'
    );
  }

  const conn = await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 8000,
  });

  console.log(
    `MongoDB connected: host=${conn.connection.host} db=${conn.connection.name}`
  );

  return conn;
};

/**
 * Returns human-readable Mongoose connection state for health checks.
 */
export const getDbStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return states[mongoose.connection.readyState] || 'unknown';
};
