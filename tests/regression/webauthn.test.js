'use strict';

const { withTestSchema } = require('../helpers/db');

function getRelyingPartyConfig(appUrl) {
  if (!appUrl) throw new Error('APP_URL não configurado.');
  const url = new URL(appUrl);
  return {
    rpID: url.hostname,
    rpName: 'Bela Essência',
    expectedOrigin: url.origin,
  };
}

describe('[Regressão v2.9.13] WebAuthn — configuração de domínio', () => {

  test('rpID nunca deve conter protocolo', () => {
    const config = getRelyingPartyConfig('https://agenda.belleplanner.com.br');
    expect(config.rpID).not.toContain('https://');
    expect(config.rpID).not.toContain('http://');
  });

  test('rpID nunca deve conter porta', () => {
    const config = getRelyingPartyConfig('https://agenda.belleplanner.com.br');
    expect(config.rpID).not.toContain(':');
  });

  test('rpID e expectedOrigin derivam da mesma origem', () => {
    const config = getRelyingPartyConfig('https://agenda.belleplanner.com.br');
    expect(config.expectedOrigin).toBe('https://agenda.belleplanner.com.br');
    expect(config.rpID).toBe('agenda.belleplanner.com.br');
    expect(config.expectedOrigin).toBe(`https://${config.rpID}`);
  });

  test('multi-tenant: domínios diferentes geram configs diferentes', () => {
    const a = getRelyingPartyConfig('https://agenda.belleplanner.com.br');
    const b = getRelyingPartyConfig('https://vortcon.belleplanner.com.br');
    expect(a.rpID).not.toBe(b.rpID);
    expect(a.expectedOrigin).not.toBe(b.expectedOrigin);
  });

  test('lança erro se APP_URL não estiver definida', () => {
    expect(() => getRelyingPartyConfig(undefined)).toThrow('APP_URL não configurado.');
  });
});

describe('[Regressão v2.9.13] WebAuthn — armazenamento de credencial', () => {

  test('public_key gravado como base64 TEXT e recuperado corretamente', async () => {
    const publicKey = Buffer.from([1, 2, 3, 4, 5]);
    const publicKeyBase64 =
