const express = require('express');
const next = require('next');
const https = require('https');
const fs = require('fs');

const dev = false;
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();
  
  server.use((req, res) => {
    return handle(req, res);
  });

  const certPath = '/etc/letsencrypt/live/collectablekit.01studio.xyz-0001/fullchain.pem';
  const keyPath = '/etc/letsencrypt/live/collectablekit.01studio.xyz-0001/privkey.pem';

  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    const options = {
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath)
    };

    https.createServer(options, server).listen(3443, () => {
      console.log('✅ HTTPS server running on https://collectablekit.01studio.xyz:3443');
    });
  } else {
    server.listen(3000, () => {
      console.log('✅ HTTP server running on port 3000');
    });
  }
});

