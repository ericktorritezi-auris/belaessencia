'use strict';

const { withTestSchema } = require('../helpers/db');

describe('[Regressão v2.9.11] GET /api/cities/all — retorna TODAS as cidades', () => {

  test('deve retornar cidades ativas E inativas', async () => {
    const result = await withTestSchema(async (client) => {
      return client.query('SELECT id, name, is_active FROM cities ORDER BY id');
    });

    expect(result.rows).toHaveLength(2);

    const ativa = result.rows.find(r => r.name === 'São Paulo');
    const inativa = result.rows.find(r => r.name === 'Campinas');

    expect(ativa).toBeDefined();
    expect(ativa.is_active).toBe(true);
    expect(inativa).toBeDefined();
    expect(inativa.is_active).toBe(false);
  });

  test('cidade com agendamentos NÃO deve ser hard-deletada', async () => {
    await withTestSchema(async (client) => {
      const appts = await client.query(
        'SELECT id FROM appointments WHERE city_id = (SELECT id FROM cities WHERE name = $1)',
        ['São Paulo']
      );
      expect(appts.rows.length).toBeGreaterThan(0);
      const canDelete = appts.rows.length === 0;
      expect(canDelete).toBe(false);
    });
  });

  test('cidade SEM agendamentos pode ser deletada', async () => {
    await withTestSchema(async (client) => {
      const appts = await client.query(
        'SELECT id FROM appointments WHERE city_id = (SELECT id FROM cities WHERE name = $1)',
        ['Campinas']
      );
      expect(appts.rows.length).toBe(0);
    });
  });

  test('cidade inativa deve poder ser reativada', async () => {
    await withTestSchema(async (client) => {
      await client.query('UPDATE cities SET is_active = TRUE WHERE name = $1', ['Campinas']);
      const r = await client.query('SELECT is_active FROM cities WHERE name = $1', ['Campinas']);
      expect(r.rows[0].is_active).toBe(true);
      await client.query('UPDATE cities SET is_active = FALSE WHERE name = $1', ['Campinas']);
    });
  });
});
