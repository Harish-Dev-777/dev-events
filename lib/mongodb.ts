import mongoose from 'mongoose';

// Extend the NodeJS global type to include our mongoose cache
declare global {
  // eslint-disable-next-line no-var
  var mongoose: {
    conn: mongoose.Connection | null;
    promise: Promise<mongoose.Connection> | null;
  };
}

// Get MongoDB URI from environment variables
const MONGODB_URI = process.env.MONGODB_URI;

// Validate that MONGODB_URI is defined
if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
  );
}

/**
 * Global cache for the mongoose connection
 * This prevents multiple connections during development hot reloads
 * In production, the global object persists across function invocations
 */
let cached = global.mongoose;

// Initialize the cache if it doesn't exist
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

/**
 * Establishes and returns a cached MongoDB connection
 * @returns Promise resolving to the Mongoose connection
 */
async function connectToDatabase(): Promise<mongoose.Connection> {
  // Return existing connection if available
  if (cached.conn) {
    return cached.conn;
  }

  // Create new connection promise if one doesn't exist
  if (!cached.promise) {
    const options = {
      bufferCommands: false, // Disable mongoose buffering
    };

    cached.promise = mongoose.connect(MONGODB_URI, options).then((mongooseInstance) => {
      return mongooseInstance.connection;
    });
  }

  try {
    // Wait for the connection to be established
    cached.conn = await cached.promise;
  } catch (error) {
    // Clear the promise cache on error to allow retry
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}

export default connectToDatabase;
