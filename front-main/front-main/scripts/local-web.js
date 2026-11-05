// Built application and same-origin API; no webpack or internet needed at startup.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(process.env.WEB_BUILD_DIR || path.join(__dirname, '../build'));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json' };
// Local test databases use separate session cookies on the same hostname.
// Browsers send cookies from every port; only forward this database's session.
const sessionCookie = process.env.COND_SESSION_COOKIE;
const server = http.createServer({maxHeaderSize:64 * 1024}, (req, res) => {
    if (/^\/api(?:\/|\?|$)/.test(req.url)) {
        const headers = { ...req.headers, host: '127.0.0.1:3000', 'x-forwarded-host':req.headers.host };
        if(sessionCookie && headers.cookie) headers.cookie = headers.cookie.split(';').map(value=>value.trim()).filter(value=>value.startsWith(sessionCookie+'=')).join('; ');
        const upstream = http.request({ hostname: '127.0.0.1', port: process.env.API_PORT || 3000, path: req.url, method: req.method, headers }, reply => {
            res.writeHead(reply.statusCode, reply.headers); reply.pipe(res);
        });
        upstream.on('error', () => { if (!res.headersSent) res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify({ message: 'Нет связи с локальным сервером. Повторите позже.' })); });
        req.pipe(upstream); return;
    }
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
    let filename;
    try { filename = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://local').pathname)); }
    catch { res.writeHead(400); res.end(); return; }
    if (filename !== root && !filename.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
    if (!fs.existsSync(filename) || !fs.statSync(filename).isFile()) {
        if (path.extname(filename)) { res.writeHead(404); res.end(); return; }
        filename = path.join(root, 'index.html');
    }
    const stream = fs.createReadStream(filename);
    stream.on('error', () => { if (!res.headersSent) res.writeHead(500); res.end(); });
    res.writeHead(200, { 'Content-Type': mime[path.extname(filename)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    if (req.method === 'HEAD') { stream.destroy(); res.end(); } else stream.pipe(res);
});
server.listen(Number(process.env.WEB_PORT || 9000), process.env.WEB_HOST || '127.0.0.1', () => console.log('COND web ready on port ' + (process.env.WEB_PORT || 9000)));
