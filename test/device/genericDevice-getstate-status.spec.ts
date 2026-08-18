/* Copyright(C) 2021-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * genericDevice-getstate-status.spec.ts: getState() reads readings from the device
 */

import { describe, expect, it, vi } from 'vitest'

import { GenericDevice } from '../../src/devices/genericDevice.js'

const log: any = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), success: vi.fn() }

function deviceWith(getDevice: () => any) {
  const client: any = { getDevice: vi.fn(getDevice) }
  return new GenericDevice({ id: 'B0E9FED044E3', type: 'meter', name: 'Meter', log }, { log, _client: client } as any)
}

describe('genericDevice.getState', () => {
  // node-switchbot hands back a device instance whose readings are only
  // reachable through getStatus(); the instance itself carries none.
  it('returns the status when the device exposes getStatus()', async () => {
    const status = { deviceId: 'B0E9FED044E3', temperature: 22.7, humidity: 55, co2: 483 }
    const state = await deviceWith(() => ({
      id: 'B0E9FED044E3',
      deviceType: 'MeterPro(CO2)',
      getStatus: async () => status,
    })).getState()

    expect(state).toEqual(status)
    expect(state.temperature).toBe(22.7)
    expect(state.co2).toBe(483)
  })

  // The device instance carries no readings, so returning it would look like a
  // valid state and every getter would report its default.
  it('reports unreadable when getStatus() throws', async () => {
    const state = await deviceWith(() => ({
      id: 'B0E9FED044E3',
      deviceType: 'MeterPro(CO2)',
      getStatus: async () => {
        throw new Error('device unreachable')
      },
    })).getState()

    expect(state.unreadable).toBe(true)
    expect(log.debug).toHaveBeenCalled()
  })

  it.each([
    ['null', null],
    ['a non-object', 'nope'],
  ])('reports unreadable when getStatus() returns %s', async (_label, returned) => {
    const state = await deviceWith(() => ({
      id: 'B0E9FED044E3',
      getStatus: async () => returned,
    })).getState()

    expect(state.unreadable).toBe(true)
  })

  it('passes through plain status objects that have no getStatus()', async () => {
    const state = await deviceWith(() => ({ temperature: 20, humidity: 40 })).getState()

    expect(state).toEqual({ temperature: 20, humidity: 40 })
  })

  it('unwraps an API-shaped body before looking for getStatus()', async () => {
    const state = await deviceWith(() => ({ body: { temperature: 19, humidity: 38 } })).getState()

    expect(state).toEqual({ temperature: 19, humidity: 38 })
  })
})
