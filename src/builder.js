const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs-extra');
const { findEntry } = require('./utils/detector');

module.exports = async function builder(userConfig = {}) {
    const root = userConfig.root || process.cwd();
    const defaultOutdir = path.join(root, 'dist');
    const outdir = userConfig.outdir ? path.resolve(root, userConfig.outdir) : defaultOutdir;

    console.log('DEBUG: Builder Root:', root);

    // Determine entry points
    const entry = await findEntry(root, userConfig);
    console.log('DEBUG: Detected Entry:', entry);

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

    // Normalize type
    const isHtml = entry.type === 'html';
    const isJs = entry.type === 'js';

    console.log(`DEBUG: Type check - HTML: ${isHtml}, JS: ${isJs} (type: '${entry.type}')`);

    try {
        // Clean dist directory
        await fs.emptyDir(outdir);

        if (isHtml) {
            // HTML Project: Copy static files
            console.log('📦 Building HTML project...');

            if (!entryPath || !fs.existsSync(entryPath)) {
                console.error(`❌ Entry HTML file not found: ${entryPath}`);
                process.exit(1);
            }

            // Copy everything except ignored patterns and the output directory itself
            const files = await fs.readdir(root);
            for (const file of files) {
                // Prevent copying the output directory into itself
                if (path.resolve(path.join(root, file)) === path.resolve(outdir)) continue;

                const rel = file;
                const ignore = [
                    'node_modules',
                    '.git',
                    'bliz.config.js',
                    'package.json',
                    'package-lock.json',
                    path.basename(outdir)
                ];

                if (!ignore.some(i => rel.startsWith(i))) {
                    await fs.copy(path.join(root, file), path.join(outdir, file));
                }
            }
            console.log('✨ Build completed successfully (HTML mode).');
            console.log(`📁 Output: ${outdir}`);
        } else if (isJs) {
            // Check for Node.js hashbang
            const content = await fs.readFile(entryPath, 'utf8');
            const isNode = content.startsWith('#!') && content.includes('node');
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
                plugins: userConfig.plugins || [],
                conditions: ['style', 'browser', 'import', 'default'] // <-- Added for Tailwind CSS support
            });
            console.log('✨ Build completed successfully (JS mode).');
        } else {
            console.error(`❌ Unknown entry type: ${entry.type}`);
            process.exit(1);
        }
    } catch (err) {
        console.error('❌ Build failed:', err);
        process.exit(1);
    }
};
