/**
 * 服务端配置回归测试
 *
 * 验证缺少任一币安凭据时，服务端请求会在调用 API 前明确失败。
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import { getServerConfig } from '../lib/config'

function restoreEnvironmentVariable(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name]
    return
  }

  process.env[name] = value
}

test('服务端配置要求同时提供币安 API Key 和 Secret', () => {
  const originalApiKey = process.env.BINANCE_API_KEY
  const originalApiSecret = process.env.BINANCE_API_SECRET

  try {
    delete process.env.BINANCE_API_KEY
    delete process.env.BINANCE_API_SECRET

    assert.throws(() => getServerConfig(), /BINANCE_API_KEY.*BINANCE_API_SECRET/)

    process.env.BINANCE_API_KEY = 'test-api-key'
    process.env.BINANCE_API_SECRET = 'test-api-secret'

    const config = getServerConfig()
    assert.equal(config.binance.apiKey, 'test-api-key')
    assert.equal(config.binance.apiSecret, 'test-api-secret')
  } finally {
    restoreEnvironmentVariable('BINANCE_API_KEY', originalApiKey)
    restoreEnvironmentVariable('BINANCE_API_SECRET', originalApiSecret)
  }
})
