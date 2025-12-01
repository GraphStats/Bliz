const { findEntry } = require('./detector');
const builder = require('../builder');
const path = require('path');
const fs = require('fs-extra');

async function test() {
    const testDir = path.join(process.cwd(), 'test-fix');
    await fs.ensureDir(testDir);

    try {
        console.log('Testing Fixes...');

        // Test 1: Next.js Detection (Pages Router)
        await fs.ensureDir(path.join(testDir, 'pages'));
        await fs.writeFile(path.join(testDir, 'pages/index.tsx'), 'export default () => "Hi"');
        let result = await findEntry(testDir);
        console.log('Test 1 (Next.js Pages):', result?.framework === 'nextjs' ? 'PASS' : 'FAIL', result);

        // Test 2: Build Crash Fix (HTML Mode)
        // Create a structure that would previously crash: root/index.html and root/dist
        await fs.emptyDir(testDir);
        await fs.writeFile(path.join(testDir, 'index.html'), '<html></html>');
        await fs.ensureDir(path.join(testDir, 'dist'));

        console.log('Test 2 (Build Crash): Running builder...');
        try {
            // Mock process.exit to avoid killing the test
            const originalExit = process.exit;
            process.exit = (code) => { if (code !== 0) throw new Error(`Process exited with ${code}`); };

            await builder({ root: testDir, outdir: 'dist' });

            process.exit = originalExit;

            if (await fs.pathExists(path.join(testDir, 'dist/index.html'))) {
                console.log('Test 2: PASS (Build succeeded and file copied)');
            } else {
                console.log('Test 2: FAIL (File not copied)');
            }
        } catch (err) {
            console.log('Test 2: FAIL (Build crashed)', err.message);
        }

    } catch (err) {
        console.error('Test failed:', err);
    } finally {
        await fs.remove(testDir);
    }
}

test();
