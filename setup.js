#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('🔋 Battery Energy Storage Optimization - Setup\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

if (fs.existsSync(envPath)) {
    console.log('✅ .env file already exists');
} else {
    console.log('📝 Creating .env file...');
    
    if (fs.existsSync(envExamplePath)) {
        fs.copyFileSync(envExamplePath, envPath);
        console.log('✅ .env file created from template');
    } else {
        // Create basic .env file
        const envContent = `# Server-side environment variables
# Add your Gemini API key here
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3001
`;
        fs.writeFileSync(envPath, envContent);
        console.log('✅ .env file created');
    }
}

// Check if API key is set
const envContent = fs.readFileSync(envPath, 'utf8');
if (envContent.includes('your_gemini_api_key_here')) {
    console.log('\n⚠️  IMPORTANT: You need to add your Gemini API key to the .env file');
    console.log('   1. Get your API key from: https://makersuite.google.com/app/apikey');
    console.log('   2. Edit the .env file and replace "your_gemini_api_key_here" with your actual key');
    console.log('   3. Never commit the .env file to version control\n');
} else {
    console.log('✅ API key appears to be configured');
}

console.log('🚀 Next steps:');
console.log('   1. npm install');
console.log('   2. npm run dev:full (to start both frontend and backend)');
console.log('   3. Open http://localhost:5173 in your browser\n');

rl.close(); 