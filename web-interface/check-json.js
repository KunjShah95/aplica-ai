
const fs = require('fs');
try {
    const json = fs.readFileSync('package.json', 'utf8');
    JSON.parse(json);
    console.log('Valid JSON');
} catch (e) {
    console.error('Invalid JSON:', e.message);
}
