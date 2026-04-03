// Lambda handler that starts the Next.js standalone server
// and proxies requests using the built-in http module
const path = require('path');
const http = require('http');

const PORT = process.env.PORT || '3000';

// Start Next.js server via dynamic import (ESM module)
process.env.PORT = PORT;
process.env.HOSTNAME = process.env.HOSTNAME || '127.0.0.1';

const serverReady = (async () => {
  // Change to the frontend directory where server.js expects to run
  process.chdir(path.join(__dirname, 'frontend'));

  // Dynamically import the ESM server module
  await import('./frontend/server.js');

  // Wait for the HTTP server to accept connections
  for (let i = 0; i < 100; i++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${PORT}/`, (res) => {
          res.resume();
          resolve();
        });
        req.on('error', reject);
        req.setTimeout(300, () => { req.destroy(); reject(new Error('timeout')); });
      });
      console.log(`Next.js server ready on port ${PORT}`);
      return;
    } catch {
      await new Promise(r => setTimeout(r, 100));
    }
  }
  throw new Error('Next.js server did not start within 10s');
})();

exports.handler = async (event) => {
  await serverReady;

  const {
    requestContext,
    rawPath = '/',
    rawQueryString = '',
    headers = {},
    body,
    isBase64Encoded,
  } = event;

  const method = requestContext?.http?.method || 'GET';
  const url = rawQueryString ? `${rawPath}?${rawQueryString}` : rawPath;

  return new Promise((resolve, reject) => {
    const reqHeaders = { ...headers };
    delete reqHeaders.host;
    reqHeaders.host = headers['x-forwarded-host'] || headers.host || 'localhost';

    const proxyReq = http.request(
      {
        hostname: '127.0.0.1',
        port: parseInt(PORT),
        path: url,
        method,
        headers: reqHeaders,
      },
      (proxyRes) => {
        const chunks = [];
        proxyRes.on('data', (chunk) => chunks.push(chunk));
        proxyRes.on('end', () => {
          const buf = Buffer.concat(chunks);
          const contentType = proxyRes.headers['content-type'] || '';
          const isText = /text|json|html|xml|javascript|css|svg/.test(contentType);

          // Collect single-value headers
          const respHeaders = {};
          for (const [k, v] of Object.entries(proxyRes.headers)) {
            if (typeof v === 'string') respHeaders[k] = v;
          }

          resolve({
            statusCode: proxyRes.statusCode,
            headers: respHeaders,
            body: isText ? buf.toString('utf-8') : buf.toString('base64'),
            isBase64Encoded: !isText,
          });
        });
      },
    );

    proxyReq.on('error', (err) => {
      console.error('Proxy error:', err);
      resolve({
        statusCode: 502,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ error: 'Bad Gateway', message: err.message }),
        isBase64Encoded: false,
      });
    });

    if (body) {
      proxyReq.write(isBase64Encoded ? Buffer.from(body, 'base64') : body);
    }
    proxyReq.end();
  });
};
