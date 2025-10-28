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

  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    const options = {
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath)
    };

    https.createServer(options, server).listen(443, '0.0.0.0', () => {
      console.log('✅ HTTPS server running on https://CollectibleKIT.01studio.xyz');
      console.log('Server ready at: https://CollectibleKIT.01studio.xyz');
    });
  } else {
    console.log('Certificate not found, starting HTTP server on port 3000');
    server.listen(3000, '0.0.0.0', () => {
      console.log('✅ HTTP server running on port 3000');
    });
  }
}).catch((ex) => {
  console.error('Failed to start server:', ex);
  process.exit(1);
});

