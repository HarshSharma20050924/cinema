const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const desktopDir = path.join(rootDir, 'desktop-app');

console.log('📦 [Prep] Syncing frontend and backend assets into desktop-app...');

// 1. Build frontend if dist doesn't exist
const distDir = path.join(rootDir, 'dist');
if (!fs.existsSync(distDir) || !fs.existsSync(path.join(distDir, 'index.html'))) {
  console.log('⚙️ [Prep] Building frontend bundle (npm run build)...');
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
}

// 2. Helper to copy directories recursively
function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 3. Copy dist, server, public into desktop-app
copyDirSync(path.join(rootDir, 'dist'), path.join(desktopDir, 'dist'));
copyDirSync(path.join(rootDir, 'server'), path.join(desktopDir, 'server'));
copyDirSync(path.join(rootDir, 'public'), path.join(desktopDir, 'public'));

console.log('✅ [Prep] Successfully prepared desktop-app assets (dist, server, public).');
