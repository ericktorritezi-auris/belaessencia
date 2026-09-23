'use strict';

const { Pool } = require('pg');

let _pool;

function getPool() {
  if (!_pool) {
    _pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return _pool;
}

async function withTestSchema(fn) {
  const client = await getPool().connect();
  try {
    await client.query('SET search_path TO tenant_test');
    return await fn(client);
  } finally {
    client.release();
  }
}

module.exports = { withTestSchema, getPool };
