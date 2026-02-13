
const fs = require('fs');
const path = require('path');

const nodeModulesPath = path.join(__dirname, 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
    fs.rmSync(nodeModulesPath, { recursive: true, force: true });
    console.log('node_modules deleted');
} else {
    console.log('node_modules not found');
}

const nextPath = path.join(__dirname, '.next');
if (fs.existsSync(nextPath)) {
    fs.rmSync(nextPath, { recursive: true, force: true });
    console.log('.next deleted');
} else {
    console.log('.next not found');
}
