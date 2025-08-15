const http = require('http');
const https = require('https');
const url = require('url');

const PORT = 3001;

// Simple CORS proxy server
const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.method !== 'GET') {
        res.writeHead(405, { 'Content-Type': 'text/plain' });
        res.end('Method not allowed');
        return;
    }

    // Get target URL from query parameter
    const queryObject = url.parse(req.url, true).query;
    const targetUrl = queryObject.url;

    if (!targetUrl) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Missing url parameter. Usage: http://localhost:3001/?url=https://example.com');
        return;
    }

    console.log(`[${new Date().toLocaleTimeString()}] Proxying request to: ${targetUrl}`);

    // Choose http or https based on target URL
    const client = targetUrl.startsWith('https://') ? https : http;

    const proxyReq = client.request(targetUrl, (proxyRes) => {
        // Set response headers
        res.writeHead(proxyRes.statusCode, {
            'Content-Type': proxyRes.headers['content-type'] || 'text/html',
            'Access-Control-Allow-Origin': '*'
        });

        // Pipe the response
        proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
        console.error(`[${new Date().toLocaleTimeString()}] Proxy error:`, err.message);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Proxy error: ${err.message}`);
    });

    proxyReq.end();
});

server.listen(PORT, () => {
    console.log(`🌐 CORS Proxy Server running on http://localhost:${PORT}`);
    console.log(`📝 Usage: http://localhost:${PORT}/?url=https://www.unige.ch/droit/ecav/examen-final/inscription`);
    console.log(`🔄 The monitor can now use this proxy to bypass CORS restrictions`);
    console.log(`⚠️  Keep this server running while monitoring external websites`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down proxy server...');
    server.close(() => {
        console.log('✅ Proxy server stopped');
        process.exit(0);
    });
});
