import http from 'http';
import handler from './[...route].js';

const PORT = 3000;

const server = http.createServer((req, res) => {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Create a URL object for the handler
  req.url = req.url || '/';
  
  handler(req, res).catch(err => {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: err.message }));
  });
});

server.listen(PORT, () => {
  console.log(`Vora API Server running at http://localhost:${PORT}`);
  console.log(`API Base: http://localhost:${PORT}/api`);
});
