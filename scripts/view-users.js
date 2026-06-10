// scripts/view-users.js
require('dotenv').config()
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

async function viewUsers() {
  try {
    const result = await pool.query(`
      SELECT id, email, name, role, "createdAt", "trialActive", "trialEndDate"
      FROM users
      ORDER BY "createdAt" DESC
      LIMIT 10
    `)

    console.log('📊 Recent users:')
    console.table(result.rows)
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await pool.end()
  }
}

viewUsers()