// scripts/init-db.js
require('dotenv').config()
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

async function initDatabase() {
  console.log('🚀 Starting database initialization...')
  
  try {
    // First, drop tables in reverse order (to avoid dependency issues)
    console.log('📦 Clearing existing tables...')
    await pool.query(`
      DROP TABLE IF EXISTS upgrade_intents CASCADE;
      DROP TABLE IF EXISTS teaser_clicks CASCADE;
      DROP TABLE IF EXISTS events CASCADE;
      DROP TABLE IF EXISTS anonymous_data CASCADE;
      DROP TABLE IF EXISTS visitors CASCADE;
      DROP TABLE IF EXISTS referrals CASCADE;
      DROP TABLE IF EXISTS purchases CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `)
    console.log('✅ Existing tables cleared')

    // Create users table FIRST (no dependencies)
    await pool.query(`
      CREATE TABLE users (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        password VARCHAR(255),
        role VARCHAR(50) DEFAULT 'user',
        avatar TEXT,
        bio TEXT,
        phone VARCHAR(50),
        "dateOfBirth" DATE,
        "birthTime" VARCHAR(50),
        "birthLocation" VARCHAR(255),
        "sessionId" VARCHAR(255) UNIQUE,
        "visitCount" INTEGER DEFAULT 1,
        "dayCount" INTEGER DEFAULT 1,
        "trialStartDate" TIMESTAMP DEFAULT NOW(),
        "trialEndDate" TIMESTAMP,
        "trialActive" BOOLEAN DEFAULT TRUE,
        "isActive" BOOLEAN DEFAULT TRUE,
        "isSuspended" BOOLEAN DEFAULT FALSE,
        "suspensionReason" TEXT,
        "suspendedAt" TIMESTAMP,
        "suspendedBy" VARCHAR(36),
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW(),
        "lastLoginAt" TIMESTAMP,
        "lastActiveAt" TIMESTAMP
      )
    `)
    console.log('✅ Users table created')

    // Create purchases table (depends on users)
    await pool.query(`
      CREATE TABLE purchases (
        id VARCHAR(36) PRIMARY KEY,
        "userId" VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
        "toolId" VARCHAR(255),
        "toolName" VARCHAR(255),
        amount DECIMAL(10,2),
        currency VARCHAR(10) DEFAULT 'USD',
        status VARCHAR(50) DEFAULT 'completed',
        "paymentMethod" VARCHAR(50),
        "paymentId" VARCHAR(255),
        "referralCode" VARCHAR(255),
        commission DECIMAL(10,2),
        metadata JSONB,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "completedAt" TIMESTAMP
      )
    `)
    console.log('✅ Purchases table created')

    // Create referrals table (depends on users)
    await pool.query(`
      CREATE TABLE referrals (
        id VARCHAR(36) PRIMARY KEY,
        "userId" VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
        code VARCHAR(255) UNIQUE,
        clicks INTEGER DEFAULT 0,
        conversions INTEGER DEFAULT 0,
        earnings DECIMAL(10,2) DEFAULT 0,
        converted BOOLEAN DEFAULT FALSE,
        "convertedAt" TIMESTAMP,
        "purchaseId" VARCHAR(36),
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `)
    console.log('✅ Referrals table created')

    // Create visitors table (independent)
    await pool.query(`
      CREATE TABLE visitors (
        id VARCHAR(36) PRIMARY KEY,
        "sessionId" VARCHAR(255) UNIQUE,
        "ipAddress" VARCHAR(50),
        country VARCHAR(100),
        city VARCHAR(100),
        "userAgent" TEXT,
        "firstVisit" TIMESTAMP DEFAULT NOW(),
        "lastVisit" TIMESTAMP DEFAULT NOW(),
        "visitCount" INTEGER DEFAULT 1,
        pages JSONB,
        events JSONB
      )
    `)
    console.log('✅ Visitors table created')

    // Create anonymous_data table (depends on users)
    await pool.query(`
      CREATE TABLE anonymous_data (
        id VARCHAR(36) PRIMARY KEY,
        "sessionId" VARCHAR(255) UNIQUE,
        name VARCHAR(255),
        dob DATE,
        "birthTime" VARCHAR(50),
        "birthLocation" VARCHAR(255),
        "referredBy" VARCHAR(255),
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW(),
        "convertedToUserId" VARCHAR(36) REFERENCES users(id)
      )
    `)
    console.log('✅ Anonymous data table created')

    // Create teaser_clicks table (depends on users)
    await pool.query(`
      CREATE TABLE teaser_clicks (
        id VARCHAR(36) PRIMARY KEY,
        "userId" VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
        "teaserType" VARCHAR(50),
        "dayNumber" INTEGER,
        "clickedAt" TIMESTAMP DEFAULT NOW()
      )
    `)
    console.log('✅ Teaser clicks table created')

    // Create upgrade_intents table (depends on users)
    await pool.query(`
      CREATE TABLE upgrade_intents (
        id VARCHAR(36) PRIMARY KEY,
        "userId" VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
        source VARCHAR(100),
        "dayNumber" INTEGER,
        "intentAt" TIMESTAMP DEFAULT NOW(),
        converted BOOLEAN DEFAULT FALSE
      )
    `)
    console.log('✅ Upgrade intents table created')

    // Create events table (independent)
    await pool.query(`
      CREATE TABLE events (
        id VARCHAR(36) PRIMARY KEY,
        type VARCHAR(100),
        data JSONB,
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `)
    console.log('✅ Events table created')

    console.log('🎉 All tables created successfully!')
    
  } catch (error) {
    console.error('❌ Error creating tables:', error.message)
  } finally {
    await pool.end()
  }
}

initDatabase()