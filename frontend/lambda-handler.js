// Lambda handler that starts the Next.js standalone server
// and proxies requests using the built-in http module
const path = require('path');
const http = require('http');
const fs = require('fs');

const PORT = process.env.PORT || '3000';

process.env.PORT = PORT;
process.env.HOSTNAME = process.env.HOSTNAME || '127.0.0.1';

let initError = null;

const serverReady = (async () => {
  try {
    const frontendDir = path.join(__dirname, 'frontend');

    // Debug: log directory contents
    console.log('Lambda root contents:', fs.readdirSync(__dirname));
    console.log('Frontend dir exists:', fs.existsSync(frontendDir));
    if (fs.existsSync(frontendDir)) {
      console.log('Frontend dir contents:', fs.readdirSync(frontendDir));
    }

    // Change working directory to where server.js expects to run
    process.chdir(frontendDir);

    // Start the Next.js server (ESM module)
    await import('./frontend/server.js');

    // Wait for server to be ready
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
    throw new Error('Next.js server did not respond within 10s');
  } catch (err) {
    console.error('Server init failed:', err);
    initError = err;
  }
})();

exports.handler = async (event) => {
  await serverReady;

  if (initError) {
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        error: 'Server initialization failed',
        message: initError.message,
        stack: initError.stack,
      }),
      isBase64Encoded: false,
    };
  }

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

  return new Promise((resolve) => {
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
