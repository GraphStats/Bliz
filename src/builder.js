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

    // Framework Handling
    if (entry.type === 'framework') {
        console.log(`📦 Detected ${entry.framework} project.`);
        console.log('🚀 Delegating build to framework CLI...');

        const { execSync } = require('child_process');
        try {
            // Prefer user's build script if available
            const pkg = await fs.readJson(path.join(root, 'package.json')).catch(() => ({}));
            const buildCmd = pkg.scripts && pkg.scripts.build ? 'npm run build' : `npx ${entry.framework} build`;

            console.log(`> ${buildCmd}`);
            execSync(buildCmd, { stdio: 'inherit', cwd: root });
            console.log('✨ Build completed successfully (Framework mode).');
            return;
        } catch (err) {
            console.error('❌ Framework build failed:', err.message);
            process.exit(1);
        }
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

            const platform = userConfig.platform || (isNode ? 'node' : 'browser');

            console.log(`📦 Building JS project with esbuild (platform: ${platform})...`);

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
                platform,
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
