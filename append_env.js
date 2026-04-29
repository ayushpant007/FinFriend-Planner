const fs = require('fs');
const path = require('path');

const jsonPath = 'C:\\\\Users\\\\Administrator\\\\Downloads\\\\fin-friend-planner-a95f4e5f6ad8.json';
const envPath = path.join(__dirname, '.env.local');

try {
  const data = fs.readFileSync(jsonPath, 'utf8');
  const json = JSON.parse(data);
  
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // Check if they already exist
  if (!envContent.includes('GOOGLE_CLIENT_EMAIL')) {
    // Escape newlines in private key so it's a single line string
    const privateKey = json.private_key.replace(/\\n/g, '\\\\n');
    
    fs.appendFileSync(envPath, `\\nGOOGLE_CLIENT_EMAIL="${json.client_email}"\\nGOOGLE_PRIVATE_KEY="${privateKey}"\\n`);
    console.log('Successfully appended credentials to .env.local');
  } else {
    console.log('Credentials already exist in .env.local');
  }
} catch (error) {
  console.error('Error:', error);
}
