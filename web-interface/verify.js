
try {
    require('autoprefixer');
    console.log('Autoprefixer is working!');
} catch (e) {
    console.error('Autoprefixer failed:', e.message);
    process.exit(1);
}
