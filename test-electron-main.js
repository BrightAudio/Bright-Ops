// Simple test to see if main.js works
try {
  console.log('Loading main.js...');
  const main = require('./dist/desktop/main.js');
  console.log('main.js loaded successfully');
} catch (err) {
  console.error('Error loading main.js:', err);
  console.error('Stack:', err.stack);
}
