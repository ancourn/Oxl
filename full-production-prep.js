#!/usr/bin/env node

const { exec } = require('child_process');
const path = require('path');

console.log('🚀 Starting Full Production Preparation...');
console.log('==========================================\n');

// Define the commands to run in sequence
const commands = [
  {
    name: 'Fix Missing Sockets',
    command: 'node scripts/fix-missing-sockets.js'
  },
  {
    name: 'Fix Notifications',
    command: 'node scripts/fix-notifications.js'
  },
  {
    name: 'Fix Permissions',
    command: 'node scripts/fix-permissions.js'
  },
  {
    name: 'Test Collaboration',
    command: 'node test-collaboration.js'
  },
  {
    name: 'Test Mail Functionality',
    command: 'node test-mail.js'
  },
  {
    name: 'Test Meet WebSocket',
    command: 'node test-meet-socket.js'
  },
  {
    name: 'Generate Final Report',
    command: 'node scripts/generate-final-report.js'
  }
];

// Function to execute a command
function executeCommand(cmd, name) {
  return new Promise((resolve, reject) => {
    console.log(`📋 ${name}...`);
    console.log(`Command: ${cmd}\n`);
    
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Error in ${name}:`);
        console.error(error.message);
        reject(error);
        return;
      }
      
      if (stderr) {
        console.warn(`⚠️  Warning in ${name}:`);
        console.warn(stderr);
      }
      
      console.log(`✅ ${name} completed successfully:`);
      console.log(stdout);
      console.log('----------------------------------------\n');
      
      resolve();
    });
  });
}

// Main function to run all commands
async function runProductionPrep() {
  try {
    for (let i = 0; i < commands.length; i++) {
      const { name, command } = commands[i];
      console.log(`🔄 Step ${i + 1}/${commands.length}: ${name}`);
      console.log('========================================\n');
      
      await executeCommand(command, name);
    }
    
    console.log('🎉 Full Production Preparation Completed!');
    console.log('==========================================');
    console.log('✅ All tests executed');
    console.log('✅ All fixes applied');
    console.log('✅ Final report generated');
    console.log('✅ Ready for deployment');
    console.log('==========================================');
    
  } catch (error) {
    console.error('💥 Production Preparation Failed:');
    console.error('====================================');
    console.error(error.message);
    process.exit(1);
  }
}

// Start the production preparation
runProductionPrep();