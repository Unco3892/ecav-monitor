const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

// Simple static file server
let REG_STATE = 'closed'; // 'closed' | 'open' | 'warning'

const server = http.createServer((req, res) => {
    // Handle favicon requests
    if (req.url === '/favicon.ico') {
        res.writeHead(404);
        res.end();
        return;
    }

    // Retain original URL for query param processing
    const originalUrl = req.url;
    const [pathPart, queryPart] = originalUrl.split('?');

    // Mock state API endpoints
    if (pathPart === '/__mock/state') {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control':'no-store' });
        res.end(JSON.stringify({ state: REG_STATE }));
        return;
    }
    if (pathPart === '/__mock/set') {
        const params = new URLSearchParams(queryPart || '');
        const next = params.get('state');
        if (['open','closed','warning'].includes(next)) {
            REG_STATE = next;
            console.log(`[STATE] Registration state set to: ${REG_STATE}`);
            res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control':'no-store' });
            res.end(JSON.stringify({ ok:true, state: REG_STATE }));
        } else {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok:false, error:'invalid state'}));
        }
        return;
    }

    // Default to index.html if no file specified
    let filePath = pathPart === '/' ? '/monitor.html' : pathPart;
    
    // Security: prevent directory traversal
    filePath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
    
    const fullPath = path.join(__dirname, filePath);
    
    // Determine content type
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml'
    };
    const contentType = contentTypes[ext] || 'text/plain';

    console.log(`[${new Date().toLocaleTimeString()}] Serving: ${filePath}`);

    // Read and serve the file
    fs.readFile(fullPath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end(`
                    <h1>404 - File Not Found</h1>
                    <p>Could not find: ${filePath}</p>
                    <p>Available files:</p>
                    <ul>
                        <li><a href="/monitor.html">monitor.html</a> - Main monitor</li>
                        <li><a href="/mock-ecav.html">mock-ecav.html</a> - Mock ECAV site</li>
                        <li><a href="/test-website.html">test-website.html</a> - Test site</li>
                        <li><a href="/test-suite.html">test-suite.html</a> - Test suite</li>
                    </ul>
                `);
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end(`Server Error: ${err.code}`);
            }
        } else {
            let output = content;
            // Dynamic mock variant injection for server-detectable differences
            if (filePath.endsWith('mock-ecav.html')) {
                try {
                    let text = content.toString('utf8');
                    // Query param overrides still supported
                    const params = new URLSearchParams(queryPart || '');
                    let effectiveState = REG_STATE;
                    if (params.has('open')) effectiveState = 'open';
                    else if (params.has('warning')) effectiveState = 'warning';
                    else if (params.has('closed')) effectiveState = 'closed';

                    const markerBlock = (label,color,emoji)=>`<div id="server-state-marker" style="margin:25px 0;padding:18px;border:3px dashed ${color};background:rgba(0,0,0,0.03);font-size:20px;font-weight:bold;text-align:center;">${emoji} SERVER STATE: ${label} ${emoji}<br><div style="font-size:12px;font-weight:normal;margin-top:8px;">(Injected block to guarantee detectable change size)</div></div>`;
                    if (effectiveState === 'open') {
                        text = text
                            .replace('id="registrationStatus" class="registration-status closed"', 'id="registrationStatus" class="registration-status open"')
                            .replace('❌ Les inscriptions sont fermées.', '✅ Les inscriptions sont ouvertes ! (server)')
                            .replace('id="openRegistrationContent" class="hidden"', 'id="openRegistrationContent"')
                            .replace('</h1>', '</h1>' + markerBlock('OPEN','green','✅'));
                    } else if (effectiveState === 'warning') {
                        text = text
                            .replace('id="registrationStatus" class="registration-status closed"', 'id="registrationStatus" class="registration-status warning"')
                            .replace('❌ Les inscriptions sont fermées.', '⚠️ Les inscriptions ouvriront bientôt (server)')
                            .replace('</h1>', '</h1>' + markerBlock('WARNING','orange','⚠️'));
                    } else { // closed
                        text = text.replace('</h1>', '</h1>' + markerBlock('CLOSED','#888','⛔'));
                    }
                    output = Buffer.from(text, 'utf8');
                } catch (e) {
                    console.warn('Dynamic mock transform failed:', e.message);
                }
            }

            // Prevent caching to ensure fresh content
            res.writeHead(200, { 
                'Content-Type': contentType,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });
            res.end(output);
        }
    });
});

server.listen(PORT, () => {
    console.log(`🌐 Local Web Server running on http://localhost:${PORT}`);
    console.log(`📁 Serving files from: ${__dirname}`);
    console.log(`🚨 Monitor: http://localhost:${PORT}/monitor.html`);
    console.log(`🧪 Mock ECAV: http://localhost:${PORT}/mock-ecav.html`);
    console.log(`🔧 Test Site: http://localhost:${PORT}/test-website.html`);
    console.log(`⚠️  Keep this server running for local testing`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down web server...');
    server.close(() => {
        console.log('✅ Web server stopped');
        process.exit(0);
    });
});
