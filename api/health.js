import sql from './db.js';

export default async function handler(request, response) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    response.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, POST, PUT, DELETE');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.status(200).end();
    return;
  }

  // Set CORS headers
  response.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, POST, PUT, DELETE');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.setHeader('Content-Type', 'application/json');

  try {
    // Test database connection
    await sql`SELECT 1 as health`;
    
    response.status(200).json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Health check failed:', error);
    response.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message,
    });
  }
}
