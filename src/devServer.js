// src/devServer.js
const http = require('http');
const path = require('path');
const fs = require('fs');
const mime = require('mime-types');
const chokidar = require('chokidar');
const WebSocket = require('ws');
const { findEntry } = require('./utils/detector');

module.exports = function devServer(userConfig = {}) {
    const root = userConfig.root || process.cwd();
    const port = userConfig.port || 3000;

    const { exec } = require('child_process');
    const net = require('net');

    // Détection de frameworks pour déléguer au dev server natif
    const pkgPath = path.join(root, 'package.json');
    let framework = null;
    if (fs.existsSync(pkgPath)) {
        try {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            const deps = { ...pkg.dependencies, ...pkg.devDependencies };
            if (deps['vite']) framework = 'vite';
            else if (deps['next']) framework = 'next';
            else if (deps['nuxt']) framework = 'nuxt';
            else if (deps['astro']) framework = 'astro';
            else if (deps['@sveltejs/kit']) framework = 'svelte-kit';
            else if (deps['@remix-run/dev']) framework = 'remix';
            else if (deps['@angular/core']) framework = 'angular';
            else if (deps['solid-start']) framework = 'solid-start';
            else if (deps['@builder.io/qwik']) framework = 'qwik';
        } catch {}
    }

    if (framework) {
        // Commande de dev par défaut pour chaque framework
        let devCmd = '';
        switch (framework) {
            case 'vite':
            case 'astro':
            case 'solid-start':
            case 'qwik':
                devCmd = `npx ${framework} dev`;
                break;
            case 'next':
                devCmd = `npx next dev -p ${port}`;
                break;
            case 'nuxt':
                devCmd = `npx nuxi dev -p ${port}`;
                break;
            case 'svelte-kit':
                devCmd = `npx svelte-kit dev --port ${port}`;
                break;
            case 'remix':
                devCmd = `npx remix dev --port ${port}`;
                break;
            case 'angular':
                devCmd = `npx ng serve --port ${port}`;
                break;
            default:
                devCmd = `npx ${framework} dev`;
        }
        console.log(`📦 Detected ${framework} project.`);
        console.log(`🚀 Delegating dev server to: ${devCmd}`);
        exec(devCmd, { cwd: root, stdio: 'inherit' });
        return;
    }

    // Helper: Find available port
    const findAvailablePort = (startPort) => {
        return new Promise((resolve, reject) => {
            const server = net.createServer();
            server.unref();
            server.on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    resolve(findAvailablePort(startPort + 1));
                } else {
                    reject(err);
                }
            });
            server.listen(startPort, () => {
                server.close(() => {
                    resolve(startPort);
                });
            });
        });
    };

    // Helper: Open browser
    const openBrowser = (url) => {
        const start = (process.platform == 'darwin' ? 'open' : process.platform == 'win32' ? 'start' : 'xdg-open');
        exec(`${start} ${url}`);
    };

    const server = http.createServer(async (req, res) => {
        // Auto-detect entry for root request
        let entryPath = null;
        const entry = await findEntry(root, userConfig);

        // Only use HTML entries for the dev server for now
        if (entry && entry.type === 'html') {
            entryPath = entry.path;
        }

        let filePath = path.join(root, req.url);

        // If root request, try to serve entry file
        if (req.url === '/' && entryPath) {
            filePath = entryPath;
        } else if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
            // Fallback for other directories
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

            // Inject HMR script into HTML
            if (contentType === 'text/html') {
                const hmrScript = `
                <script>
                    (function() {
                        console.log('[Bliz] Connecting to HMR...');
                        const socket = new WebSocket('ws://' + window.location.host);
                        socket.onmessage = function(msg) {
                            const data = JSON.parse(msg.data);
                            if (data.type === 'reload') {
                                console.log('[Bliz] Reloading...');
                                window.location.reload();
                            }
                        };
                        socket.onopen = () => console.log('[Bliz] HMR Connected');
                    })();
                </script>
                `;
                const html = data.toString();
                const injectedHtml = html.replace('</body>', hmrScript + '</body>');
                res.end(injectedHtml);
            } else {
                res.end(data);
            }
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

    // Start server with smart port detection
    findAvailablePort(port).then(availablePort => {
        server.listen(availablePort, () => {
            const url = `http://localhost:${availablePort}`;
            console.log(`🚀 Bliz dev server running at ${url}`);
            if (availablePort !== port) {
                console.log(`⚠️  Port ${port} was busy, switched to ${availablePort}`);
            }
            openBrowser(url);
        });
    });
};
