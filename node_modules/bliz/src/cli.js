// src/cli.js
const path = require('path');
const fs = require('fs');

// Load user config if exists
let userConfig = {};
const configPath = path.resolve(process.cwd(), 'bliz.config.js');
if (fs.existsSync(configPath)) {
    userConfig = require(configPath);
}

const command = process.argv[2];
if (!command) {
    console.error('Please specify a command: dev | build');
    process.exit(1);
}

switch (command) {
    case 'dev':
        require('./devServer')(userConfig);
        break;
    case 'build':
        require('./builder')(userConfig);
        break;
    default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
}
