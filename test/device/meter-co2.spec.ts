/* Copyright(C) 2021-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * meter-co2.spec.ts: Meter Pro (CO2) exposes a CarbonDioxideSensor service
 */

import { describe, expect, it, vi } from 'vitest'

import { MeterDevice } from '../../src/devices/genericDevice.js'

const log: any = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), success: vi.fn() }

function meter(deviceType: string, status: Record<string, unknown>) {
  const device = new MeterDevice({ id: 'B0E9FED044E3', type: 'meter', deviceType, name: 'Meter', log } as any, { log } as any)
  vi.spyOn(device, 'getState').mockResolvedValue(status)
  return device
}

const READING = { temperature: 22.7, humidity: 55, co2: 483 }

function serviceTypes(device: MeterDevice) {
  return device.createHAPAccessory(null).services.map((s: any) => s.type)
}

function get(device: MeterDevice, type: string, characteristic: string) {
  const service = device.createHAPAccessory(null).services.find((s: any) => s.type === type)
  return service.characteristics[characteristic].get()
}

describe('meterDevice CO2 support', () => {
  it('adds a CarbonDioxideSensor for the CO2 variant', () => {
    expect(serviceTypes(meter('MeterPro(CO2)', READING))).toContain('CarbonDioxideSensor')
  })

  // A plain Meter has no CO2 sensor; a 0 ppm tile would look like a real reading.
  it.each(['Meter', 'Meter Plus', 'MeterPro', 'Outdoor Meter', ''])('omits it for %s', (deviceType) => {
    const types = serviceTypes(meter(deviceType, { temperature: 20, humidity: 40 }))

    expect(types).not.toContain('CarbonDioxideSensor')
    expect(types).toContain('TemperatureSensor')
    expect(types).toContain('HumiditySensor')
  })

  it('accepts the spaced device type spelling too', () => {
    expect(serviceTypes(meter('Meter Pro (CO2)', READING))).toContain('CarbonDioxideSensor')
  })

  it('reports the CO2 level in ppm', async () => {
    await expect(get(meter('MeterPro(CO2)', READING), 'CarbonDioxideSensor', 'CarbonDioxideLevel')).resolves.toBe(483)
  })

  it.each([
    [483, 0],
    [999, 0],
    [1000, 1],
    [1500, 1],
  ])('maps %i ppm to detected=%i', async (co2, expected) => {
    await expect(get(meter('MeterPro(CO2)', { ...READING, co2 }), 'CarbonDioxideSensor', 'CarbonDioxideDetected')).resolves.toBe(expected)
  })

  it('reports 0 and normal when the reading is missing', async () => {
    const device = meter('MeterPro(CO2)', { temperature: 22, humidity: 50 })

    await expect(get(device, 'CarbonDioxideSensor', 'CarbonDioxideLevel')).resolves.toBe(0)
    await expect(get(device, 'CarbonDioxideSensor', 'CarbonDioxideDetected')).resolves.toBe(0)
  })

  it('still reports temperature and humidity', async () => {
    const device = meter('MeterPro(CO2)', READING)

    await expect(get(device, 'TemperatureSensor', 'CurrentTemperature')).resolves.toBe(22.7)
    await expect(get(device, 'HumiditySensor', 'CurrentRelativeHumidity')).resolves.toBe(55)
  })
})
