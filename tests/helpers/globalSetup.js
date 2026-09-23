'use strict';

const { Pool } = require('pg');

async function globalSetup() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query('DROP SCHEMA IF EXISTS tenant_test CASCADE');
    await client.query('CREATE SCHEMA tenant_test');

    await client.query(`
      CREATE TABLE tenant_test.cities (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE tenant_test.work_configs (
        id SERIAL PRIMARY KEY,
        city_id INTEGER REFERENCES tenant_test.cities(id) ON DELETE SET NULL,
        slot_interval INTEGER DEFAULT 30,
        start_time TIME DEFAULT '08:00',
        end_time TIME DEFAULT '18:00'
      )
    `);

    await client.query(`
      CREATE TABLE tenant_test.appointments (
        id SERIAL PRIMARY KEY,
        city_id INTEGER,
        client_name VARCHAR(200),
        scheduled_at TIMESTAMPTZ
      )
    `);

    await client.query(`
      CREATE TABLE tenant_test.webauthn_credentials (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        credential_id TEXT NOT NULL UNIQUE,
        public_key TEXT NOT NULL,
        counter INTEGER DEFAULT 0,
        transports TEXT[] DEFAULT '{}'
      )
    `);

    await client.query(`
      CREATE TABLE tenant_test.push_subscriptions (
        id SERIAL PRIMARY KEY,
        tenant_schema TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        p256dh TEXT,
        auth TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      INSERT INTO tenant_test.cities (name, slug, is_active) VALUES
        ('São Paulo', 'sao-paulo', true),
        ('Campinas', 'campinas', false)
    `);

    await client.query(`
      INSERT INTO tenant_test.work_configs (city_id, slot_interval) VALUES
        (1, 30),
        (2, 60)
    `);

    await client.query(`
      INSERT INTO tenant_test.appointments (city_id, client_name, scheduled_at)
      VALUES (1, 'Ana Paula', NOW())
    `);

    global.__TEST_POOL__ = pool;
    global.__TEST_CLIENT__ = client;
  } catch (err) {
    client.release();
    await pool.end();
    throw err;
  }
}

module.exports = globalSetup;
