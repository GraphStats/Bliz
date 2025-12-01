// src/builder.js
// src/builder.js
const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs-extra');
const { findEntry } = require('./utils/detector');

module.exports = async function builder(userConfig = {}) {
    const root = userConfig.root || process.cwd();
    const defaultOutdir = path.join(root, 'dist');
    const outdir = userConfig.outdir ? path.resolve(root, userConfig.outdir) : defaultOutdir;

    // Determine entry points
    const entry = await findEntry(root, userConfig);

    if (!entry) {
        console.error('❌ No recognizable entry point found!');
        console.error('   Provide either an index.html, src/index.js, or specify `entry` in bliz.config.js');
        process.exit(1);
    }

    const entryPath = entry.path;
    const isHtmlProject = entry.type === 'html';
    const isJsProject = entry.type === 'js';

    try {
        // Clean dist directory
        await fs.emptyDir(outdir);

        if (isHtmlProject) {
            // HTML Project: Copy static files
            console.log('📦 Building HTML project...');

            if (!entryPath || !fs.existsSync(entryPath)) {
                console.error(`❌ Entry HTML file not found: ${entryPath}`);
                process.exit(1);
            }

            // Copy everything except ignored patterns
            await fs.copy(root, outdir, {
                filter: (src) => {
                    const rel = path.relative(root, src);
                    const ignore = [
                        'node_modules',
                        'dist',
                        '.git',
                        'bliz.config.js',
                        'package.json',
                        'package-lock.json'
                    ];
                    return !ignore.some(i => rel.startsWith(i));
                }
            });
            console.log('✨ Build completed successfully (HTML mode).');
            console.log(`📁 Output: ${outdir}`);
        } else if (isJsProject) {
            // JS Project: Bundle with esbuild
            console.log('📦 Building JS project with esbuild...');

            if (!entryPath || !fs.existsSync(entryPath)) {
                console.error(`❌ Entry JS file not found: ${entryPath}`);
                process.exit(1);
            }
            await esbuild.build({
                entryPoints: [entryPath],
                bundle: true,
                minify: true,
                sourcemap: true,
                outdir,
                platform: 'browser',
                target: ['esnext'],
                define: { 'process.env.NODE_ENV': '"production"' },
                plugins: userConfig.plugins || []
            });
            console.log('✨ Build completed successfully (JS mode).');
        } else {
            console.error('❌ No recognizable entry point found!');
            console.error('   Provide either an index.html, src/index.js, or specify `entry` in bliz.config.js');
            process.exit(1);
        }
    } catch (err) {
        console.error('❌ Build failed:', err);
        process.exit(1);
    }
};
