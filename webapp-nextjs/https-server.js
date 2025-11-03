const express = require('express');
const next = require('next');
const https = require('https');
const http = require('http');
const fs = require('fs');

const dev = false;
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();
  
  // Use middleware to handle all routes
  server.use(async (req, res) => {
    return handle(req, res);
  });

  const certPath = '/etc/letsencrypt/live/collectablekit.01studio.xyz-0001/fullchain.pem';
  const keyPath = '/etc/letsencrypt/live/collectablekit.01studio.xyz-0001/privkey.pem';

  // Always use HTTP - nginx handles HTTPS termination
  console.log('Starting HTTP server on port 3000 (HTTPS handled by nginx)');
    server.listen(3000, '0.0.0.0', () => {
      console.log('✅ HTTP server running on port 3000');
    });
}).catch((ex) => {
  console.error('Failed to start server:', ex);
  process.exit(1);
});

