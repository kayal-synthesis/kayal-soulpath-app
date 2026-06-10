// test.js
require('dotenv').config();
console.log('DATABASE_URL is:', process.env.DATABASE_URL ? 'SET ✓' : 'NOT SET ✗');