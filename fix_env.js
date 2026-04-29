const fs = require('fs');

const json = JSON.parse(fs.readFileSync('C:\\\\Users\\\\Administrator\\\\Downloads\\\\fin-friend-planner-a95f4e5f6ad8.json', 'utf8'));

// Convert the newlines to literal \n string so dotenv parses them correctly
const privateKey = json.private_key.replace(/\n/g, '\\n');

const envContent = `GOOGLE_CLIENT_EMAIL="${json.client_email}"\nGOOGLE_PRIVATE_KEY="${privateKey}"\n`;

fs.writeFileSync('.env.local', envContent);
console.log('Fixed .env.local');
