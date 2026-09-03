const { execSync } = require('child_process');
const fs = require('fs');

// Render sets RENDER_SERVICE_TYPE to 'static' for Static Sites
if (process.env.RENDER_SERVICE_TYPE === 'static') {
  console.log('Detected Render Static Site deployment. Skipping Prisma client generation.');
  process.exit(0);
}

if (fs.existsSync('./backend/prisma/schema.prisma') || fs.existsSync('../backend/prisma/schema.prisma')) {
  console.log('Running postinstall Prisma client generation...');
  try {
    execSync('npm run prisma:generate --workspace=@kootaflow/backend', { stdio: 'inherit' });
  } catch (error) {
    console.warn('Postinstall Prisma generation warning:', error.message);
  }
}
