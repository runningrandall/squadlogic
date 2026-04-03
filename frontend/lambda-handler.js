// Lambda handler that starts the Next.js standalone server
// and proxies requests using the built-in http module
const { createServer } = require('http');
const path = require('path');

// Start Next.js server
process.env.PORT = process.env.PORT || '3000';
process.env.HOSTNAME = process.env.HOSTNAME || '0.0.0.0';
process.chdir(path.join(__dirname, 'frontend'));
require('./frontend/server.js');

// Wait for the server to be ready, then export a handler
// that proxies Lambda events to the HTTP server
const serverUrl = `http://127.0.0.1:${process.env.PORT}`;

async function waitForServer(maxRetries = 50) {
  const http = require('http');
  for (let i = 0; i < maxRetries; i++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(serverUrl, (res) => {
          res.resume();
          resolve();
        });
        req.on('error', reject);
        req.setTimeout(200, () => { req.destroy(); reject(new Error('timeout')); });
      });
      return;
    } catch {
      await new Promise(r => setTimeout(r, 100));
    }
  }
  throw new Error('Next.js server did not start');
}

const serverReady = waitForServer();

exports.handler = async (event) => {
  await serverReady;

  const http = require('http');
  const { method = 'GET', rawPath = '/', rawQueryString = '', headers = {}, body, isBase64Encoded } = event;

  const url = rawQueryString ? `${rawPath}?${rawQueryString}` : rawPath;

  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: parseInt(process.env.PORT),
      path: url,
      method,
      headers: {
        ...Object.fromEntries(
          Object.entries(headers).filter(([k]) => k !== 'host')
        ),
        host: headers['x-forwarded-host'] || headers.host || 'localhost',
      },
    };

    const proxyReq = http.request(options, (proxyRes) => {
      const chunks = [];
      proxyRes.on('data', (chunk) => chunks.push(chunk));
      proxyRes.on('end', () => {
        const responseBody = Buffer.concat(chunks);
        const isText = (proxyRes.headers['content-type'] || '').match(/text|json|html|xml|javascript|css|svg/);

        resolve({
          statusCode: proxyRes.statusCode,
          headers: Object.fromEntries(
            Object.entries(proxyRes.headers).filter(([, v]) => typeof v === 'string')
          ),
          body: isText ? responseBody.toString('utf-8') : responseBody.toString('base64'),
          isBase64Encoded: !isText,
        });
      });
    });

    proxyReq.on('error', reject);

    if (body) {
      proxyReq.write(isBase64Encoded ? Buffer.from(body, 'base64') : body);
    }
    proxyReq.end();
  });
};
