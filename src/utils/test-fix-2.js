const { exec } = require('child_process');
const path = require('path');
const fs = require('fs-extra');

async function test() {
    const testDir = path.join(process.cwd(), 'test-fix-2');
    await fs.ensureDir(testDir);

    try {
        console.log('Testing Build Crash Fix...');

        // Setup: root/index.html and root/dist
        await fs.writeFile(path.join(testDir, 'index.html'), '<html></html>');
        await fs.ensureDir(path.join(testDir, 'dist'));

        // Create a dummy builder script that uses the local builder
        const scriptPath = path.join(testDir, 'build.js');
        const builderPath = path.resolve('src/builder.js').replace(/\\/g, '\\\\');

        await fs.writeFile(scriptPath, `
            const builder = require('${builderPath}');
            builder({ root: '${testDir.replace(/\\/g, '\\\\')}', outdir: 'dist' })
                .catch(err => {
                    console.error(err);
                    process.exit(1);
                });
        `);

        // Run it
        await new Promise((resolve, reject) => {
            exec(`node ${scriptPath}`, (error, stdout, stderr) => {
                console.log('STDOUT:', stdout);
                console.log('STDERR:', stderr);
                if (error) {
                    console.log('Test 2: FAIL (Process exited with error)');
                    reject(error);
                } else {
                    console.log('Test 2: PASS');
                    resolve();
                }
            });
        });

    } catch (err) {
        console.error('Test failed:', err);
    } finally {
        await fs.remove(testDir);
    }
}

test();
