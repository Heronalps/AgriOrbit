const { execSync } = require('child_process');
const path = require('path');

const VERCEL_ENV = process.env.VERCEL_ENV;

// Check if VERCEL_ENV is set to any of the known Vercel environments
if (VERCEL_ENV && (VERCEL_ENV === 'production' || VERCEL_ENV === 'preview' || VERCEL_ENV === 'development')) {
  console.log(`prepare.js: VERCEL_ENV set to '${VERCEL_ENV}', skipping 'poetry install'. This is expected in Vercel build environments.`);
} else {
  if (VERCEL_ENV) {
    console.log(`prepare.js: VERCEL_ENV is '${VERCEL_ENV}' (not a standard Vercel build env value for skipping), proceeding with 'poetry install' for local/other CI setup.`);
  } else {
    console.log("prepare.js: VERCEL_ENV is not set, proceeding with 'poetry install' for local development setup.");
  }
  try {
    const backendDir = path.join(__dirname, 'backend');
    console.log(`prepare.js: Running 'poetry install' in ${backendDir}...`);
    execSync('poetry install', { cwd: backendDir, stdio: 'inherit' });
    console.log("prepare.js: 'poetry install' completed successfully.");
  } catch (error) {
    console.error("prepare.js: Failed to run 'poetry install'. Error:", error.message);
    // process.exit(1); // Optionally exit if poetry install fails
  }
}
