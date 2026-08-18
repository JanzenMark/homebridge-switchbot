/* Copyright(C) 2021-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * meter-battery.spec.ts: Meter exposes a Battery service
 */

import { describe, expect, it, vi } from 'vitest'

import { MeterDevice } from '../../src/devices/genericDevice.js'

const log: any = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), success: vi.fn() }

function meter(status: Record<string, unknown>) {
  const device = new MeterDevice({ id: 'B0E9FED044E3', type: 'meter', name: 'Meter', log } as any, { log } as any)
  vi.spyOn(device, 'getState').mockResolvedValue(status)
  return device
}

function get(device: MeterDevice, characteristic: string) {
  const service = device.createHAPAccessory(null).services.find((s: any) => s.type === 'Battery')
  return service.characteristics[characteristic].get()
}

describe('meterDevice battery support', () => {
  it('exposes a Battery service', () => {
    const types = meter({ temperature: 22, humidity: 50, battery: 100 }).createHAPAccessory(null).services.map((s: any) => s.type)

    expect(types).toContain('Battery')
  })

  it('reports the battery level', async () => {
    await expect(get(meter({ battery: 100 }), 'BatteryLevel')).resolves.toBe(100)
    await expect(get(meter({ battery: 42 }), 'BatteryLevel')).resolves.toBe(42)
  })

  it.each([
    [100, 0],
    [11, 0],
    [10, 1],
    [3, 1],
    [0, 1],
  ])('maps %i%% to low=%i', async (battery, expected) => {
    await expect(get(meter({ battery }), 'StatusLowBattery')).resolves.toBe(expected)
  })

  // Reporting 0 % for an unknown level would alert on every device that does
  // not send one, which is worse than reporting nothing useful.
  it.each([
    ['absent', {}],
    ['null', { battery: null }],
    ['non-numeric', { battery: 'full' }],
  ])('reports the level as unknown when it is %s', async (_label, status) => {
    await expect(get(meter(status), 'BatteryLevel')).resolves.toBeUndefined()
    await expect(get(meter(status), 'StatusLowBattery')).resolves.toBeUndefined()
  })

  it('reports the battery as not chargeable', async () => {
    await expect(get(meter({ battery: 80 }), 'ChargingState')).resolves.toBe(2)
  })
})
