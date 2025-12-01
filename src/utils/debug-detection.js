const { findEntry } = require('./detector');
const path = require('path');

async function debug() {
    const root = process.cwd();
    console.log('Root:', root);

    try {
        const result = await findEntry(root);
        console.log('Result:', result);
    } catch (err) {
        console.error('Error:', err);
    }
}

debug();
