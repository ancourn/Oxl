#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Verifying Oxl Workspace setup...\n');

const checks = [
  {
    name: 'Node.js version',
    check: () => {
      try {
        const version = execSync('node --version', { encoding: 'utf8' }).trim();
        const majorVersion = parseInt(version.replace('v', '').split('.')[0]);
        return majorVersion >= 18;
      } catch {
        return false;
      }
    },
    success: '✅ Node.js 18+ installed',
    failure: '❌ Node.js 18+ required'
  },
  {
    name: 'npm available',
    check: () => {
      try {
        execSync('npm --version', { encoding: 'utf8' });
        return true;
      } catch {
        return false;
      }
    },
    success: '✅ npm available',
    failure: '❌ npm not found'
  },
  {
    name: 'Dependencies installed',
    check: () => {
      return fs.existsSync(path.join(process.cwd(), 'node_modules'));
    },
    success: '✅ Dependencies installed',
    failure: '❌ Run "npm install" first'
  },
  {
    name: 'Environment file',
    check: () => {
      return fs.existsSync(path.join(process.cwd(), '.env'));
    },
    success: '✅ Environment file exists',
    failure: '❌ Create .env file from .env.example'
  },
  {
    name: 'Database file',
    check: () => {
      return fs.existsSync(path.join(process.cwd(), 'prisma/dev.db')) || fs.existsSync(path.join(process.cwd(), 'dev.db'));
    },
    success: '✅ Database file exists',
    failure: '❌ Run "npx prisma db push" first'
  },
  {
    name: 'Prisma client generated',
    check: () => {
      return fs.existsSync(path.join(process.cwd(), 'node_modules/.prisma'));
    },
    success: '✅ Prisma client generated',
    failure: '❌ Run "npx prisma generate" first'
  },
  {
    name: 'Build successful',
    check: () => {
      try {
        execSync('npm run build', { stdio: 'pipe' });
        return true;
      } catch {
        return false;
      }
    },
    success: '✅ Build successful',
    failure: '❌ Build failed'
  }
];

let allPassed = true;

for (const test of checks) {
  try {
    const passed = test.check();
    if (passed) {
      console.log(test.success);
    } else {
      console.log(test.failure);
      allPassed = false;
    }
  } catch (error) {
    console.log(test.failure);
    allPassed = false;
  }
}

console.log('\n' + '='.repeat(50));

if (allPassed) {
  console.log('🎉 All checks passed! Your setup looks good.');
  console.log('\n🚀 Next steps:');
  console.log('1. Run "npm run dev" to start the development server');
  console.log('2. Open http://localhost:3000 in your browser');
  console.log('3. Use test accounts: test@example.com / password123');
} else {
  console.log('❌ Some checks failed. Please address the issues above.');
  console.log('\n💡 Run "./setup.sh" for automated setup');
}

console.log('\nFor more information, see SETUP.md');