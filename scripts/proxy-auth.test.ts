/**
 * 路由代理认证回归测试
 *
 * 确保受保护页面在服务端重定向，避免客户端加载后才发现会话失效。
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import { NextRequest } from 'next/server'

process.env.ACCESS_CODE = 'test-access-code'

async function getProxyModule() {
  return import('../proxy')
}

async function createAuthenticatedRequest(pathname: string): Promise<NextRequest> {
  const { AUTH_COOKIE_NAME, createAuthSessionToken } = await import('../lib/middleware/auth')
  const token = await createAuthSessionToken(Date.now() + 60 * 1000)

  return new NextRequest(`http://localhost${pathname}`, {
    headers: {
      cookie: `${AUTH_COOKIE_NAME}=${token}`,
    },
  })
}

test('未认证访问看板会在服务端重定向到登录页', async () => {
  const { proxy } = await getProxyModule()
  const response = await proxy(new NextRequest('http://localhost/dashboard'))

  assert.equal(response.status, 307)
  assert.equal(response.headers.get('location'), 'http://localhost/login?redirect=%2Fdashboard')
})

test('有效会话可以直接访问看板', async () => {
  const { proxy } = await getProxyModule()
  const response = await proxy(await createAuthenticatedRequest('/dashboard'))

  assert.equal(response.headers.get('x-middleware-next'), '1')
})

test('未认证 API 请求继续返回标准 JSON 401', async () => {
  const { proxy } = await getProxyModule()
  const response = await proxy(new NextRequest('http://localhost/api/binance/account'))

  assert.equal(response.status, 401)
  assert.equal(response.headers.get('content-type'), 'application/json')
})
