'use strict';

const { withTestSchema } = require('../helpers/db');

function generateSlots(startTime, endTime, intervalMinutes) {
  const slots = [];
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  let current = startH * 60 + startM;
  const end = endH * 60 + endM;
  while (current + intervalMinutes <= end) {
    const h = String(Math.floor(current / 60)).padStart(2, '0');
    const m = String(current % 60).padStart(2, '0');
    slots.push(`${h}:${m}`);
    current += intervalMinutes;
  }
  return slots;
}

describe('[Regressão v2.9.12] Slots configuráveis por cidade', () => {

  test('30 min para São Paulo', async () => {
    const config = await withTestSchema(async (client) => {
      const r = await client.query(
        'SELECT wc.slot_interval, wc.start_time, wc.end_time FROM work_configs wc JOIN cities c ON c.id = wc.city_id WHERE c.name = $1',
        ['São Paulo']
      );
      return r.rows[0];
    });
    expect(config.slot_interval).toBe(30);
    const slots = generateSlots(config.start_time.slice(0, 5), config.end_time.slice(0, 5), config.slot_interval);
    expect(slots).toHaveLength(20);
    expect(slots[0]).toBe('08:00');
    expect(slots[slots.length - 1]).toBe('17:30');
  });

  test('60 min para Campinas', async () => {
    const config = await withTestSchema(async (client) => {
      const r = await client.query(
        'SELECT wc.slot_interval, wc.start_time, wc.end_time FROM work_configs wc JOIN cities c ON c.id = wc.city_id WHERE c.name = $1',
        ['Campinas']
      );
      return r.rows[0];
    });
    expect(config.slot_interval).toBe(60);
    const slots = generateSlots(config.start_time.slice(0, 5), config.end_time.slice(0, 5), config.slot_interval);
    expect(slots).toHaveLength(10);
    expect(slots[0]).toBe('08:00');
    expect(slots[slots.length - 1]).toBe('17:00');
  });

  test('intervalos diferentes geram slots distintos', () => {
    const slots30 = generateSlots('09:00', '12:00', 30);
    const slots60 = generateSlots('09:00', '12:00', 60);
    expect(slots30).toHaveLength(6);
    expect(slots60).toHaveLength(3);
    expect(slots30).not.toEqual(slots60);
  });

  test('orphaned work_configs não quebram a query', async () => {
    await withTestSchema(async (client) => {
      await client.query('INSERT INTO work_configs (city_id, slot_interval) VALUES (NULL, 30)');
      const r = await client.query(
        'SELECT wc.slot_interval FROM work_configs wc JOIN cities c ON c.id = wc.city_id WHERE c.is_active = TRUE'
      );
      expect(r.rows).toHaveLength(1);
      await client.query('DELETE FROM work_configs WHERE city_id IS NULL');
    });
  });
});
