/**
 * 带访问码认证的 fetch 封装
 */

const ACCESS_CODE_KEY = 'access_code';

/**
 * 获取存储的访问码
 */
export function getStoredAccessCode(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_CODE_KEY);
}

/**
 * 存储访问码
 */
export function storeAccessCode(code: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCESS_CODE_KEY, code);
}

/**
 * 清除访问码
 */
export function clearAccessCode(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_CODE_KEY);
}

/**
 * 带认证的 fetch
 *
 * 自动从 localStorage 获取访问码并添加到请求头
 */
export function fetchWithAuth(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const accessCode = getStoredAccessCode();

  // 合并 headers
  const headers: Record<string, string> = {};

  // 添加访问码
  if (accessCode) {
    headers['x-access-code'] = accessCode;
  }

  // 添加原有的 headers
  if (init?.headers) {
    const originalHeaders = init.headers as Record<string, string> | Headers;
    if (originalHeaders instanceof Headers) {
      originalHeaders.forEach((value, key) => {
        headers[key] = value;
      });
    } else {
      Object.assign(headers, originalHeaders);
    }
  }

  return fetch(input, {
    ...init,
    headers,
  });
}
