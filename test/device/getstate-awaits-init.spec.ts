/* Copyright(C) 2021-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * getstate-awaits-init.spec.ts: reads must not depend on startup ordering
 */

import { describe, expect, it, vi } from 'vitest'

import { GenericDevice } from '../../src/devices/genericDevice.js'

const log: any = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), success: vi.fn() }

/**
 * A client that only resolves devices once init() has completed, which is how
 * the real one behaves: the platform starts init() without awaiting it.
 */
function lazyClient() {
  let ready = false
  return {
    init: vi.fn(async () => {
      await new Promise(resolve => setTimeout(resolve, 5))
      ready = true
    }),
    getDevice: vi.fn(async () => (ready ? { getStatus: async () => ({ temperature: 22.7, co2: 483 }) } : undefined)),
  }
}

describe('genericDevice.getState client readiness', () => {
  it('awaits init() so the first read is not lost', async () => {
    const client = lazyClient()
    const device = new GenericDevice({ id: 'B0E9FED044E3', type: 'meter', name: 'M', log }, { log, _client: client } as any)

    const state = await device.getState()

    expect(client.init).toHaveBeenCalled()
    expect(state.co2).toBe(483)
    expect(state.temperature).toBe(22.7)
  })

  it('still works with a client that exposes no init()', async () => {
    const client = { getDevice: async () => ({ temperature: 20 }) }
    const device = new GenericDevice({ id: 'x', type: 'meter', name: 'M', log }, { log, _client: client } as any)

    await expect(device.getState()).resolves.toEqual({ temperature: 20 })
  })

  it('falls back cleanly when init() rejects', async () => {
    const client = {
      init: async () => {
        throw new Error('no network')
      },
      getDevice: async () => ({ temperature: 20 }),
    }
    const device = new GenericDevice({ id: 'x', type: 'meter', name: 'M', log }, { log, _client: client } as any)

    await expect(device.getState()).resolves.toEqual({ id: 'x', type: 'meter', unreadable: true })
  })
})
