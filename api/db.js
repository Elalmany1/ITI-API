import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create SQL client with connection pooling for Vercel
const sql = postgres(connectionString, {
  ssl: 'require',
  max: 3, // Vercel serverless functions need limited connections
  idle_timeout: 20,
  connect_timeout: 10,
});

// Export for use in API routes
export default sql;
