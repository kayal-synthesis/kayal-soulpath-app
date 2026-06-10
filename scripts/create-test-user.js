// scripts/create-test-user.js
require('dotenv').config()
const { Pool } = require('pg')
const crypto = require('crypto')
const bcrypt = require('bcryptjs')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

async function createTestUser() {
  try {
    // Generate a unique ID
    const id = crypto.randomUUID()
    const hashedPassword = await bcrypt.hash('Test123!', 10)

    const result = await pool.query(
      `INSERT INTO users (id, email, name, password, role, "trialActive", "trialEndDate")
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, name, role, "createdAt"`,
      [id, 'test@example.com', 'Test User', hashedPassword, 'user', true, new Date(Date.now() + 7*24*60*60*1000)]
    )

    console.log('✅ Test user created:', result.rows[0])
    
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      console.log('⚠️ Test user already exists')
    } else {
      console.error('❌ Error:', error.message)
    }
  } finally {
    await pool.end()
  }
}

createTestUser()