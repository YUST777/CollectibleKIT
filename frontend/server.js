const express = require('express');
const next = require('next');

const dev = false;
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();
  
  server.use((req, res) => {
    return handle(req, res);
  });

  // Run on HTTP only - nginx handles HTTPS
  // Use port 3003 to match nginx proxy configuration
  server.listen(3003, () => {
    console.log('✅ HTTP server running on port 3003 (nginx handles HTTPS)');
  });
});

