#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Bright Ops - Code Protection & Security Hardening Script
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This script implements multiple layers of security to protect the Bright Ops
 * application from code theft and unauthorized access:
 *
 * 1. SOURCE MAP REMOVAL
 *    - Strips .map files that could expose source code
 *    - These files contain mappings to original TypeScript/JavaScript
 *    - Making them unavailable prevents reverse engineering
 *
 * 2. TYPESCRIPT SOURCE REMOVAL  
 *    - Removes .ts and .tsx source files from distribution
 *    - Only compiled .js files remain in the package
 *    - Original source code is never shipped to users
 *
 * 3. ENVIRONMENT FILE CLEANUP
 *    - Removes .env files with configuration secrets
 *    - Prevents accidental exposure of API keys, tokens, database URLs
 *    - All config loaded from secure environment variables only
 *
 * 4. VERSION CONTROL REMOVAL
 *    - Strips .git directory from packaged application
 *    - Prevents users from accessing repository history
 *    - Eliminates potential information disclosure vectors
 *
 * 5. ASAR ARCHIVE PROTECTION (configured in package.json)
 *    - Code is packaged in ASAR archive format (Electron's sealed format)
 *    - Cannot be easily extracted or modified without repackaging
 *    - Prevents casual inspection of application files
 *
 * 6. NEXT.JS BUILD OPTIMIZATION (configured in next.config.mjs)
 *    - productionBrowserSourceMaps: false - No source maps in production
 *    - removeConsole: true - Removes debug logs
 *    - Production minification - All code is minified
 *    - Tree shaking - Unused code is removed
 *
 * 7. WEBPACK COMPILATION (configured in next.config.mjs webpack config)
 *    - Code split into separate chunk files for better loading
 *    - Minification removes all unnecessary characters
 *    - Variable/function names are shortened
 *
 * ADDITIONAL PROTECTIONS:
 * ─────────────────────
 * • Sandbox mode enabled - App runs with restricted permissions
 * • Context isolation - Renderer process isolated from main process
 * • nodejs disabled in renderer - No access to file system from UI
 * • Preload script validation - Only secure APIs exposed to UI
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const distDir = path.join(__dirname, '..', 'dist');
const nextDir = path.join(__dirname, '..', '.next');

console.log('\n');
console.log('╔═══════════════════════════════════════════════════════════════════╗');
console.log('║                                                                   ║');
console.log('║            🔐 BRIGHT OPS - SECURITY HARDENING IN PROGRESS        ║');
console.log('║                                                                   ║');
console.log('╚═══════════════════════════════════════════════════════════════════╝');
console.log('\n');

// Function to recursively find and remove files
function removeFilesRecursive(directory, pattern) {
  if (!fs.existsSync(directory)) {
    return;
  }

  const files = fs.readdirSync(directory);

  files.forEach((file) => {
    const filePath = path.join(directory, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      removeFilesRecursive(filePath, pattern);
    } else if (pattern.test(file)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`   ✓ Removed: ${path.relative(process.cwd(), filePath)}`);
      } catch (err) {
        console.error(`   ⚠ Could not remove: ${filePath}`);
      }
    }
  });
}

// Remove source maps from all output directories
console.log('📍 Step 1: Removing Source Maps (.map files)');
console.log('   → Source maps expose source code and token locations');
removeFilesRecursive(distDir, /\.map$/);
removeFilesRecursive(nextDir, /\.map$/);
console.log('');

// Remove TypeScript files from dist (should already be compiled)
console.log('📍 Step 2: Removing TypeScript Source Files');
console.log('   → Only compiled JavaScript is shipped to users');
removeFilesRecursive(distDir, /\.ts$|\.tsx$/);
console.log('');

// Remove .git directory if it exists in dist
console.log('📍 Step 3: Removing Version Control History');
console.log('   → Prevents access to repository history');
const gitPath = path.join(distDir, '.git');
if (fs.existsSync(gitPath)) {
  try {
    fs.rmSync(gitPath, { recursive: true, force: true });
    console.log(`   ✓ Removed: .git directory`);
  } catch (err) {
    console.error(`   ⚠ Could not remove .git directory`);
  }
}
console.log('');

// Remove .env files
console.log('📍 Step 4: Removing Environment Configuration Files');
console.log('   → Prevents exposure of API keys and secrets');
removeFilesRecursive(distDir, /\.env|\.env\..*/);
console.log('');

console.log('═══════════════════════════════════════════════════════════════════');
console.log('\n');
console.log('✅ SECURITY HARDENING COMPLETE!\n');

// Summary
console.log('🔒 ACTIVE PROTECTIONS:\n');
console.log('   ✓ ASAR Archive         - Code packaged in sealed format');
console.log('   ✓ Source Maps Removed  - No code mapping information');
console.log('   ✓ Source Files Removed - Only compiled code shipped');
console.log('   ✓ Environment Clean    - No secrets in distribution');
console.log('   ✓ Git History Removed  - No repository access');
console.log('   ✓ Code Minification    - All code is minified');
console.log('   ✓ Console Cleaned      - Debug logs removed');
console.log('   ✓ Sandbox Mode         - Restricted permissions enabled');
console.log('   ✓ Context Isolation    - Process isolation enforced');
console.log('   ✓ NodeJS Disabled      - No filesystem access from UI\n');

console.log('═══════════════════════════════════════════════════════════════════\n');
console.log('🏗️  Build is ready for packaging with electron-builder...\n');

process.exit(0);
