/* Copyright(C) 2021-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * switchbotClient-init.spec.ts: init() is safe to call repeatedly and concurrently
 */

import { describe, expect, it, vi } from 'vitest'

import { SwitchBotClient } from '../src/switchbotClient.js'

function makeClient() {
  const log: any = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), success: vi.fn() }
  return new SwitchBotClient({ openApiToken: 't', openApiSecret: 's', logger: log, log } as any)
}

describe('switchBotClient.init', () => {
  // The platform starts init() without awaiting it while a characteristic read
  // awaits it. Without a shared in-flight promise each caller builds its own
  // client, and each one starts a BLE scanner.
  it('runs one attempt for concurrent callers', async () => {
    const spy = vi.spyOn(SwitchBotClient.prototype as any, 'doInit')
    try {
      const client = makeClient()

      await Promise.all([client.init(), client.init(), client.init()])

      expect(spy).toHaveBeenCalledTimes(1)
    } finally {
      spy.mockRestore()
    }
  })

  it('does not repeat the attempt once a client exists', async () => {
    const client = makeClient()
    // Stand in for a successful build so the assertion does not depend on
    // node-switchbot loading in the test environment.
    const spy = vi.spyOn(client as any, 'doInit').mockImplementation(async () => {
      ;(client as any).client = { discover: async () => [] }
    })

    await client.init()
    await client.init()
    await client.init()

    expect(spy).toHaveBeenCalledTimes(1)
    expect((client as any).client).toBeDefined()
  })

  it('lets a later caller retry after a failed attempt', async () => {
    const client = makeClient()
    const spy = vi.spyOn(client as any, 'doInit').mockRejectedValueOnce(new Error('import failed'))

    await expect(client.init()).rejects.toThrow('import failed')
    // The in-flight promise must be cleared, or every later call replays the failure.
    expect((client as any).initPromise).toBeUndefined()

    spy.mockResolvedValueOnce(undefined)
    await expect(client.init()).resolves.toBeUndefined()
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('resolves for every caller', async () => {
    const client = makeClient()

    await expect(Promise.all([client.init(), client.init()])).resolves.toBeDefined()
  })
})
