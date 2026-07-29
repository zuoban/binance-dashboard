/**
 * Binance REST 客户端回归测试
 *
 * 覆盖 Listen Key 生命周期的 HTTP 方法与签名参数，避免错误地将 PUT/DELETE
 * 回退为 POST/GET。
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import type { AxiosAdapter, AxiosInstance } from 'axios'
import { BinanceRestClient } from '../lib/binance/rest-client'
import { BinanceSignature } from '../lib/binance/signature'
import { RateLimiter } from '../lib/middleware/rate-limit'

interface CapturedRequest {
  method?: string
  url?: string
  baseURL?: string
  params?: Record<string, string>
}

interface RestClientInternals {
  client: AxiosInstance
}

function createTestClient(): {
  client: BinanceRestClient
  requests: CapturedRequest[]
} {
  const client = new BinanceRestClient({
    apiKey: 'test-api-key',
    apiSecret: 'test-api-secret',
    baseUrl: 'https://testnet.binancefuture.com',
  })
  const requests: CapturedRequest[] = []
  const axiosClient = (client as unknown as RestClientInternals).client

  const adapter: AxiosAdapter = async config => {
    requests.push({
      method: config.method,
      url: config.url,
      baseURL: config.baseURL,
      params:
        config.params instanceof URLSearchParams
          ? Object.fromEntries(config.params.entries())
          : (config.params as Record<string, string> | undefined),
    })

    return {
      data: { listenKey: 'test-listen-key' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }
  axiosClient.defaults.adapter = adapter

  return { client, requests }
}

function assertSignedParams(params: Record<string, string> | undefined): void {
  assert.ok(params)
  assert.match(params.timestamp, /^\d{13}$/)
  assert.match(params.signature, /^[a-f0-9]{64}$/)
}

test('Listen Key 生命周期使用正确 HTTP 方法并带签名参数', async () => {
  const { client, requests } = createTestClient()

  await client.getListenKey()
  await client.keepAliveListenKey('active-listen-key')
  await client.closeListenKey('active-listen-key')

  assert.deepEqual(
    requests.map(request => request.method),
    ['post', 'put', 'delete']
  )

  for (const request of requests) {
    assert.equal(request.url, '/fapi/v1/listenKey')
    assert.equal(request.baseURL, 'https://testnet.binancefuture.com')
    assertSignedParams(request.params)
  }

  assert.equal(requests[1].params?.listenKey, 'active-listen-key')
  assert.equal(requests[2].params?.listenKey, 'active-listen-key')
})

test('签名 GET 请求保留调用方配置的 API 基础地址', async () => {
  const { client, requests } = createTestClient()

  await client.getAccountInfo()

  const [request] = requests
  assert.equal(request.method, 'get')
  assert.equal(request.url, '/fapi/v2/account')
  assert.equal(request.baseURL, 'https://testnet.binancefuture.com')
  assertSignedParams(request.params)
})

test('不同限流器不会共享同一客户端计数器', () => {
  const strictLimiter = new RateLimiter('strict-test', {
    windowMs: 60 * 1000,
    maxRequests: 1,
  })
  const generalLimiter = new RateLimiter('general-test', {
    windowMs: 60 * 1000,
    maxRequests: 2,
  })

  assert.equal(strictLimiter.check('client-a').allowed, true)
  assert.equal(strictLimiter.check('client-a').allowed, false)
  assert.equal(generalLimiter.check('client-a').allowed, true)
})

test('签名查询参数会被编码并与签名保持一致', () => {
  const { queryString, signature } = BinanceSignature.buildSignedQuery(
    {
      symbol: 'BTCUSDT',
      origClientOrderId: 'order /?&= test',
    },
    'test-api-secret'
  )

  assert.match(queryString, /origClientOrderId=order\+%2F%3F%26%3D\+test/)
  assert.equal(BinanceSignature.verifySignature(queryString, signature, 'test-api-secret'), true)
})
