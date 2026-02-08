#!/usr/bin/env node

/**
 * TypeScript Error Tracker
 * 
 * This script helps track progress on fixing TypeScript errors.
 * Run with: node track-errors.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

function runTypeCheck() {
    console.log(`${colors.cyan}Running TypeScript compiler...${colors.reset}\n`);

    try {
        execSync('npx tsc --noEmit', { encoding: 'utf-8', stdio: 'pipe' });
        console.log(`${colors.green}✓ No TypeScript errors found!${colors.reset}\n`);
        return { success: true, errors: [] };
    } catch (error) {
        const output = error.stdout || error.stderr || '';
        return { success: false, errors: parseErrors(output) };
    }
}

function parseErrors(output) {
    const lines = output.split('\n');
    const errors = [];
    const fileErrors = {};

    for (const line of lines) {
        // Match pattern: src/path/file.ts(line,col): error TSxxxx: message
        const match = line.match(/^(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/);
        if (match) {
            const [, file, line, col, code, message] = match;
            const error = { file, line: parseInt(line), col: parseInt(col), code, message };
            errors.push(error);

            if (!fileErrors[file]) {
                fileErrors[file] = [];
            }
            fileErrors[file].push(error);
        }
    }

    return { errors, fileErrors, total: errors.length };
}

function displaySummary(result) {
    if (result.success) {
        return;
    }

    const { errors, fileErrors, total } = result.errors;

    console.log(`${colors.red}Found ${total} TypeScript errors${colors.reset}\n`);

    // Group by file
    const sortedFiles = Object.entries(fileErrors).sort((a, b) => b[1].length - a[1].length);

    console.log(`${colors.yellow}Errors by file:${colors.reset}`);
    console.log('─'.repeat(80));

    for (const [file, errs] of sortedFiles) {
        const shortFile = file.replace(/^src\//, '');
        const count = errs.length;
        const color = count > 10 ? colors.red : count > 5 ? colors.yellow : colors.blue;
        console.log(`${color}${count.toString().padStart(3)}${colors.reset}  ${shortFile}`);
    }

    console.log('─'.repeat(80));
    console.log(`\n${colors.cyan}Total files with errors: ${sortedFiles.length}${colors.reset}\n`);
}

function displayTopErrors(result) {
    if (result.success) {
        return;
    }

    const { errors } = result.errors;
    const errorCodes = {};

    for (const error of errors) {
        if (!errorCodes[error.code]) {
            errorCodes[error.code] = { count: 0, examples: [] };
        }
        errorCodes[error.code].count++;
        if (errorCodes[error.code].examples.length < 3) {
            errorCodes[error.code].examples.push({
                file: error.file,
                line: error.line,
                message: error.message,
            });
        }
    }

    const sortedCodes = Object.entries(errorCodes).sort((a, b) => b[1].count - a[1].count);

    console.log(`${colors.yellow}Most common error types:${colors.reset}`);
    console.log('─'.repeat(80));

    for (let i = 0; i < Math.min(10, sortedCodes.length); i++) {
        const [code, data] = sortedCodes[i];
        console.log(`\n${colors.cyan}${code}${colors.reset} (${data.count} occurrences)`);

        const example = data.examples[0];
        const shortFile = example.file.replace(/^src\//, '');
        console.log(`  ${shortFile}:${example.line}`);
        console.log(`  ${colors.blue}${example.message.substring(0, 70)}...${colors.reset}`);
    }

    console.log('\n' + '─'.repeat(80) + '\n');
}

function saveReport(result) {
    if (result.success) {
        return;
    }

    const { errors, fileErrors, total } = result.errors;
    const timestamp = new Date().toISOString();

    const report = {
        timestamp,
        total,
        fileCount: Object.keys(fileErrors).length,
        files: Object.entries(fileErrors).map(([file, errs]) => ({
            file,
            errorCount: errs.length,
            errors: errs,
        })).sort((a, b) => b.errorCount - a.errorCount),
    };

    const reportPath = path.join(__dirname, 'error-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`${colors.green}Report saved to: error-report.json${colors.reset}\n`);
}

function compareWithBaseline() {
    const baselinePath = path.join(__dirname, 'error-baseline.json');

    if (!fs.existsSync(baselinePath)) {
        console.log(`${colors.yellow}No baseline found. Run with --save-baseline to create one.${colors.reset}\n`);
        return;
    }

    const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));
    const current = runTypeCheck();

    if (current.success) {
        console.log(`${colors.green}All errors fixed! 🎉${colors.reset}`);
        console.log(`Baseline had ${baseline.total} errors.\n`);
        return;
    }

    const currentTotal = current.errors.total;
    const diff = baseline.total - currentTotal;
    const diffColor = diff > 0 ? colors.green : diff < 0 ? colors.red : colors.yellow;

    console.log(`${colors.cyan}Progress Report:${colors.reset}`);
    console.log('─'.repeat(80));
    console.log(`Baseline errors: ${baseline.total}`);
    console.log(`Current errors:  ${currentTotal}`);
    console.log(`${diffColor}Difference:      ${diff > 0 ? '+' : ''}${diff}${colors.reset}`);

    if (diff > 0) {
        const percentage = ((diff / baseline.total) * 100).toFixed(1);
        console.log(`${colors.green}${percentage}% reduction 📉${colors.reset}`);
    }

    console.log('─'.repeat(80) + '\n');
}

// Main execution
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
    console.log(`
${colors.cyan}TypeScript Error Tracker${colors.reset}

Usage:
  node track-errors.js [options]

Options:
  --save-baseline    Save current errors as baseline for comparison
  --compare          Compare current errors with baseline
  --detailed         Show detailed error breakdown
  --help, -h         Show this help message

Examples:
  node track-errors.js                    # Run basic error check
  node track-errors.js --save-baseline    # Save current state
  node track-errors.js --compare          # Compare with baseline
  node track-errors.js --detailed         # Show detailed breakdown
  `);
    process.exit(0);
}

if (args.includes('--save-baseline')) {
    const result = runTypeCheck();
    if (!result.success) {
        const baselinePath = path.join(__dirname, 'error-baseline.json');
        const { errors, fileErrors, total } = result.errors;
        const baseline = {
            timestamp: new Date().toISOString(),
            total,
            fileCount: Object.keys(fileErrors).length,
        };
        fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2));
        console.log(`${colors.green}Baseline saved: ${total} errors${colors.reset}\n`);
    }
    process.exit(0);
}

if (args.includes('--compare')) {
    compareWithBaseline();
    process.exit(0);
}

// Default: run check and show summary
const result = runTypeCheck();

if (!result.success) {
    displaySummary(result);

    if (args.includes('--detailed')) {
        displayTopErrors(result);
    }

    saveReport(result);

    console.log(`${colors.cyan}Tip: Run with --save-baseline to track progress${colors.reset}\n`);
}

process.exit(result.success ? 0 : 1);
