// src/builder.js
const esbuild = require('esbuild');
const path = require('path');

module.exports = function builder(userConfig = {}) {
    const root = userConfig.root || process.cwd();
    const entry = path.join(root, 'src', 'index.js'); // default entry
    const outdir = path.join(root, 'dist');

    esbuild.build({
        entryPoints: [entry],
        bundle: true,
        minify: true,
        sourcemap: true,
        outdir,
        platform: 'browser',
        target: ['esnext'],
        define: { 'process.env.NODE_ENV': '"production"' },
        plugins: userConfig.plugins || []
    }).then(() => {
        console.log('Build completed successfully.');
    }).catch(err => {
        console.error('Build failed:', err);
        process.exit(1);
    });
};
