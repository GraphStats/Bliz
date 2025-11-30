// src/devServer.js
const http = require('http');
const path = require('path');
const fs = require('fs');
const mime = require('mime-types');
const chokidar = require('chokidar');
const WebSocket = require('ws');

module.exports = function devServer(userConfig = {}) {
    const root = userConfig.root || process.cwd();
    const port = userConfig.port || 3000;

    const server = http.createServer((req, res) => {
        let filePath = path.join(root, req.url);
        if (fs.statSync(filePath).isDirectory()) {
            filePath = path.join(filePath, 'index.html');
        }
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.statusCode = 404;
                res.end('Not Found');
                return;
            }
            const contentType = mime.lookup(filePath) || 'application/octet-stream';
            res.setHeader('Content-Type', contentType);
            res.end(data);
        });
    });

    // WebSocket for HMR
    const wss = new WebSocket.Server({ server });
    wss.on('connection', ws => {
        console.log('HMR client connected');
    });

    // Watch files and notify clients
    const watcher = chokidar.watch(root, { ignoreInitial: true });
    watcher.on('change', file => {
        console.log(`File changed: ${file}`);
        const relativePath = path.relative(root, file).replace(/\\/g, '/');
        const message = JSON.stringify({ type: 'reload', path: `/${relativePath}` });
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });

    server.listen(port, () => {
        console.log(`Bliz dev server running at http://localhost:${port}`);
    });
};
