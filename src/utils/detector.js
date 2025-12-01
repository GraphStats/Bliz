const fs = require('fs-extra');
const path = require('path');

/**
 * Recursively searches for entry files with priority.
 * @param {string} dir - Directory to search.
 * @param {string[]} ignores - List of directories to ignore.
 * @param {number} depth - Current depth (to limit recursion).
 * @returns {Promise<Array<{path: string, type: string, score: number}>>}
 */
async function findCandidates(dir, ignores, depth = 0) {
    if (depth > 3) return []; // Limit recursion depth
    let candidates = [];

    try {
        const files = await fs.readdir(dir);

        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = await fs.stat(fullPath);

            if (stat.isDirectory()) {
                if (!ignores.includes(file) && !file.startsWith('.')) {
                    candidates = candidates.concat(await findCandidates(fullPath, ignores, depth + 1));
                }
            } else {
                // Scoring logic:
                // Root files > src files > nested files
                // HTML > JS/TS
                // index > main > others

                let score = 0;
                const ext = path.extname(file).toLowerCase();
                const name = path.basename(file, ext).toLowerCase();
                const relativePath = path.relative(process.cwd(), fullPath); // Assuming process.cwd() is root for scoring context
                const depthScore = 10 - depth; // Deeper files get lower score

                if (['.html'].includes(ext)) score += 20;
                else if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) score += 10;
                else continue; // Not a candidate

                if (name === 'index') score += 5;
                if (name === 'main') score += 3;

                if (relativePath.startsWith('src')) score += 2;

                candidates.push({
                    path: fullPath,
                    type: ext === '.html' ? 'html' : 'js',
                    score: score + depthScore
                });
            }
        }
    } catch (err) {
        // Ignore access errors
    }

    return candidates;
}

/**
 * Finds the best entry point for the project.
 * @param {string} root - Project root.
 * @param {object} userConfig - User configuration.
 * @returns {Promise<{path: string, type: 'html'|'js'}|null>}
 */
async function findEntry(root, userConfig = {}) {
    // 1. Explicit config
    if (userConfig.entry) {
        const entryPath = path.resolve(root, userConfig.entry);
        if (fs.existsSync(entryPath)) {
            return {
                path: entryPath,
                type: entryPath.endsWith('.html') ? 'html' : 'js'
            };
        }
    }

    // 2. Package.json main
    const pkgPath = path.join(root, 'package.json');
    if (fs.existsSync(pkgPath)) {
        try {
            const pkg = await fs.readJson(pkgPath);
            if (pkg.main) {
                const mainPath = path.resolve(root, pkg.main);
                if (fs.existsSync(mainPath)) {
                    return {
                        path: mainPath,
                        type: mainPath.endsWith('.html') ? 'html' : 'js'
                    };
                }
            }
        } catch (e) {
            // Ignore invalid package.json
        }
    }

    // 3. Smart Search
    const ignores = ['node_modules', 'dist', '.git', 'coverage', 'test', 'tests'];
    const candidates = await findCandidates(root, ignores);

    if (candidates.length > 0) {
        // Sort by score descending
        candidates.sort((a, b) => b.score - a.score);
        return {
            path: candidates[0].path,
            type: candidates[0].type
        };
    }

    return null;
}

module.exports = { findEntry };
