'use strict';

const { withTestSchema } = require('../helpers/db');

describe('[Regressão] Push Notifications — schema prefix', () => {

  beforeAll(async () => {
    await withTestSchema(async (client) => {
      await client.query(`
        INSERT INTO push_subscriptions (tenant_schema, endpoint, p256dh, auth)
        VALUES
          ('tenant_001', 'https://fcm.googleapis.com/endpoint-1', 'key1', 'auth1'),
          ('tenant_terapiaevolutiva', 'https://fcm.googleapis.com/endpoint-2', 'key2', 'auth2')
      `);
    });
  });

  afterAll(async () => {
    await withTestSchema(async (client) => {
      await client.query('DELETE FROM push_subscriptions');
    });
  });

  test('deve buscar subscriptions por tenant_schema', async () => {
    const result = await withTestSchema(async (client) => {
      return client.query(
        'SELECT * FROM push_subscriptions WHERE tenant_schema = $1',
        ['tenant_001']
      );
    });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].endpoint).toContain('endpoint-1');
  });

  test('subscriptions de tenants diferentes são isoladas', async () => {
    const r1 = await withTestSchema(async (c) =>
      c.query('SELECT count(*) FROM push_subscriptions WHERE tenant_schema = $1', ['tenant_001'])
    );
    const r2 = await withTestSchema(async (c) =>
      c.query('SELECT count(*) FROM push_subscriptions WHERE tenant_schema = $1', ['tenant_terapiaevolutiva'])
    );
    expect(Number(r1.rows[0].count)).toBe(1);
    expect(Number(r2.rows[0].count)).toBe(1);
  });

  test('query AT TIME ZONE não causa syntax error', async () => {
    await expect(
      withTestSchema(async (client) => {
        return client.query(`SELECT NOW() AT TIME ZONE 'America/Sao_Paulo' AS local_time`);
      })
    ).resolves.toBeDefined();
  });
});
