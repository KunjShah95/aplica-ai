
try {
    const autoprefixer = require('autoprefixer');
    console.log('Success: autoprefixer found');
} catch (e) {
    console.error('Error: ' + e.message);
    console.error('Require stack:', e.requireStack);
}
