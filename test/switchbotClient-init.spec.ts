/* Copyright(C) 2021-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * switchbotClient-init.spec.ts: init() is safe to call repeatedly and concurrently
 */

import { describe, expect, it, vi } from 'vitest'

import { SwitchBotClient } from '../src/switchbotClient.js'

function makeClient() {
  const log: any = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), success: vi.fn() }
  const client = new SwitchBotClient({ openApiToken: 't', openApiSecret: 's', logger: log, log } as any)
  // Each attempt reports exactly one outcome: success via info, failure via warn.
  const attempts = () => log.info.mock.calls.length + log.warn.mock.calls.length
  return { client, attempts }
}

describe('switchBotClient.init', () => {
  // The platform starts init() without awaiting it while a characteristic read
  // awaits it. Without a shared in-flight promise each caller builds its own
  // client, and each one starts a BLE scanner.
  it('runs one attempt for concurrent callers', async () => {
    const { client, attempts } = makeClient()

    await Promise.all([client.init(), client.init(), client.init()])

    expect(attempts()).toBe(1)
  })

  it('does not repeat the attempt on a later call', async () => {
    const { client, attempts } = makeClient()

    await client.init()
    const after = attempts()
    await client.init()

    expect(attempts()).toBe(after)
  })

  it('resolves for every caller', async () => {
    const { client } = makeClient()

    await expect(Promise.all([client.init(), client.init()])).resolves.toBeDefined()
    await expect(client.init()).resolves.toBeUndefined()
  })
})
