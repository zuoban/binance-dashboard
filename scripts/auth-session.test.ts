/**
 * 认证会话回归测试
 *
 * 验证会话令牌的有效期和签名都由服务端校验，不能只依赖浏览器 Cookie 的 Max-Age。
 */

import assert from 'node:assert/strict'
import test from 'node:test'

process.env.ACCESS_CODE = 'test-access-code'

async function getAuthModule() {
  return import('../lib/middleware/auth')
}

test('有效会话令牌可通过服务端验证', async () => {
  const { createAuthSessionToken, validateAuthSession } = await getAuthModule()
  const token = await createAuthSessionToken(Date.now() + 60 * 1000)

  assert.equal(await validateAuthSession(token), true)
})

test('过期或被篡改的会话令牌会被拒绝', async () => {
  const { createAuthSessionToken, validateAuthSession } = await getAuthModule()
  const expiredToken = await createAuthSessionToken(Date.now() - 1)
  const validToken = await createAuthSessionToken(Date.now() + 60 * 1000)
  const tamperedToken = `${validToken}tampered`

  assert.equal(await validateAuthSession(expiredToken), false)
  assert.equal(await validateAuthSession(tamperedToken), false)
})
