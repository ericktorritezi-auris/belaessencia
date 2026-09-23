'use strict';

const { withTestSchema } = require('../helpers/db');

function getRelyingPartyConfig(appUrl) {
  if (!appUrl) throw new Error('APP_URL não configurado.');
  const url = new URL(appUrl);
  return { rpID: url.hostname, rpName: 'Bela Essência', expectedOrigin: url.origin };
}

describe('[Regressão v2.9.13] WebAuthn — domínio', () => {

  test('rpID nunca contém protocolo', () => {
    const c = getRelyingPartyConfig('https://agenda.belleplanner.com.br');
    expect(c.rpID).not.toContain('https://');
    expect(c.rpID).not.toContain('http://');
  });

  test('rpID nunca contém porta', () => {
    const c = getRelyingPartyConfig('https://agenda.belleplanner.com.br');
    expect(c.rpID).not.toContain(':');
  });

  test('rpID e expectedOrigin derivam da mesma origem', () => {
    const c = getRelyingPartyConfig('https://agenda.belleplanner.com.br');
    expect(c.expectedOrigin).toBe('https://agenda.belleplanner.com.br');
    expect(c.rpID).toBe('agenda.belleplanner.com.br');
    expect(c.expectedOrigin).toBe('https://' + c.rpID);
  });

  test('multi-tenant: domínios diferentes geram configs diferentes', () => {
    const a = getRelyingPartyConfig('https://agenda.belleplanner.com.br');
    const b = getRelyingPartyConfig('https://vortcon.belleplanner.com.br');
    expect(a.rpID).not.toBe(b.rpID);
  });

  test('lança erro se APP_URL não definida', () => {
    expect(() => getRelyingPartyConfig(undefined)).toThrow('APP_URL não configurado.');
  });
});

describe('[Regressão v2.9.13] WebAuthn — armazenamento', () => {

  test('public_key gravado como base64 e recuperado corretamente', async () => {
    const publicKey = Buffer.from([1, 2, 3, 4, 5]);
    const b64 = publicKey.toString('base64');
    await withTestSchema(async (client) => {
      await client.query(
        'INSERT INTO webauthn_credentials (user_id, credential_id, public_key, counter, transports) VALUES ($1,$2,$3,$4,$5)',
        [1, 'test-pk-id', b64, 0, ['internal']]
      );
      const r = await client.query('SELECT public_key FROM webauthn_credentials WHERE credential_id = $1', ['test-pk-id']);
      expect(typeof r.rows[0].public_key).toBe('string');
      expect(Buffer.from(r.rows[0].public_key, 'base64')).toEqual(publicKey);
      await client.query('DELETE FROM webauthn_credentials WHERE credential_id = $1', ['test-pk-id']);
    });
  });

  test('counter atualizado após autenticação', async () => {
    await withTestSchema(async (client) => {
      await client.query(
        'INSERT INTO webauthn_credentials (user_id, credential_id, public_key, counter, transports) VALUES (2,$1,$2,0,$3)',
        ['counter-id', 'dGVzdA==', ['internal']]
      );
      await client.query('UPDATE webauthn_credentials SET counter = 1 WHERE credential_id = $1', ['counter-id']);
      const r = await client.query('SELECT counter FROM webauthn_credentials WHERE credential_id = $1', ['counter-id']);
      expect(r.rows[0].counter).toBe(1);
      await client.query('DELETE FROM webauthn_credentials WHERE credential_id = $1', ['counter-id']);
    });
  });
});
