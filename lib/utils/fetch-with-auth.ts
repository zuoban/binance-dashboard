/**
 * 基于 HttpOnly 会话 Cookie 的 fetch 封装
 */

/**
 * 带认证的 fetch。浏览器会自动携带不可由 JavaScript 读取的 HttpOnly Cookie。
 */
export function fetchWithAuth(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, {
    ...init,
    credentials: init?.credentials || 'same-origin',
  })
}
