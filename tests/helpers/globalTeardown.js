'use strict';

async function globalTeardown() {
  if (global.__TEST_CLIENT__) {
    try {
      await global.__TEST_CLIENT__.query('DROP SCHEMA IF EXISTS tenant_test CASCADE');
    } catch (_) {}
    global.__TEST_CLIENT__.release();
  }
  if (global.__TEST_POOL__) {
    await global.__TEST_POOL__.end();
  }
}

module.exports = globalTeardown;
