/**
 * 币安 API 签名工具
 * 使用 HMAC SHA256 算法对请求参数进行签名
 *
 * 参考: https://developers.binance.com/docs/zh-CN/binance-spot-api-docs/rest-api#signed-trade-and-user_data-endpoint-security
 */

import { createHmac, timingSafeEqual } from 'crypto'

/**
 * 签名工具类
 */
export class BinanceSignature {
  /**
   * 生成 HMAC SHA256 签名
   *
   * @param queryString - 查询字符串（包含 timestamp）
   * @param secretKey - 币安 API Secret
   * @returns 签名后的十六进制字符串
   *
   * @example
   * ```ts
   * const signature = BinanceSignature.generateSignature('timestamp=1639000000000&symbol=BTCUSDT', 'your-secret-key');
   * ```
   */
  static generateSignature(queryString: string, secretKey: string): string {
    return createHmac('sha256', secretKey).update(queryString).digest('hex')
  }

  /**
   * 获取当前时间戳（毫秒）
   *
   * @returns 当前时间戳
   */
  static getTimestamp(): string {
    return Date.now().toString()
  }

  /**
   * 构建带签名的查询字符串
   *
   * @param params - 请求参数对象
   * @param secretKey - 币安 API Secret
   * @returns 包含签名和原始查询字符串的对象
   *
   * @example
   * ```ts
   * const { queryString, signature } = BinanceSignature.buildSignedQuery({
   *   symbol: 'BTCUSDT',
   *   limit: 10
   * }, 'your-secret-key');
   * ```
   */
  static buildSignedQuery(
    params: Record<string, string | number | boolean | undefined>,
    secretKey: string
  ): { queryString: string; signature: string } {
    // 添加时间戳
    const paramsWithTimestamp: Record<string, string> = {
      ...(Object.fromEntries(
        Object.entries(params).filter(([_, value]) => value !== undefined)
      ) as Record<string, string>),
      timestamp: this.getTimestamp(),
    }

    // 构建查询字符串（按参数名排序）
    const queryString = Object.keys(paramsWithTimestamp)
      .sort()
      .map(key => `${key}=${paramsWithTimestamp[key]}`)
      .join('&')

    // 生成签名
    const signature = this.generateSignature(queryString, secretKey)

    return { queryString, signature }
  }

  /**
   * 验证签名（用于测试）
   *
   * @param queryString - 查询字符串
   * @param signature - 待验证的签名
   * @param secretKey - 币安 API Secret
   * @returns 签名是否有效
   */
  static verifySignature(queryString: string, signature: string, secretKey: string): boolean {
    const expectedSignature = this.generateSignature(queryString, secretKey)
    return timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature))
  }

  /**
   * 对 URL 进行签名
   *
   * @param baseUrl - 基础 URL（已包含路径）
   * @param params - 请求参数
   * @param secretKey - 币安 API Secret
   * @returns 完整的带签名 URL
   *
   * @example
   * ```ts
   * const url = BinanceSignature.signUrl(
   *   'https://fapi.binance.com/fapi/v2/account',
   *   {},
   *   'your-secret-key'
   * );
   * ```
   */
  static signUrl(
    baseUrl: string,
    params: Record<string, string | number | boolean | undefined>,
    secretKey: string
  ): string {
    const { queryString, signature } = this.buildSignedQuery(params, secretKey)
    const separator = baseUrl.includes('?') ? '&' : '?'
    return `${baseUrl}${separator}${queryString}&signature=${signature}`
  }
}

/**
 * 签名错误类型
 */
export class SignatureError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SignatureError'
  }
}
