/**
 * 环境变量配置和验证
 *
 * 使用 Zod 进行运行时环境变量验证
 */

import { z } from 'zod'

/**
 * 环境变量 Schema 定义
 */
const envSchema = z.object({
  // 应用配置
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),

  // 币安 API 配置（服务端专用）
  BINANCE_API_KEY: z.string().min(1, 'API Key is required'),
  BINANCE_API_SECRET: z.string().min(1, 'API Secret is required'),

  // API 端点
  NEXT_PUBLIC_BINANCE_REST_API: z.string().url().default('https://fapi.binance.com'),
  NEXT_PUBLIC_BINANCE_WS_API: z.string().url().default('wss://fstream.binance.com/ws'),

  // 可选配置
  BINANCE_TESTNET: z
    .string()
    .optional()
    .transform(val => val === 'true'),
})

/**
 * 验证并解析环境变量
 */
function validateEnv() {
  try {
    const env = envSchema.parse({
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      BINANCE_API_KEY: process.env.BINANCE_API_KEY,
      BINANCE_API_SECRET: process.env.BINANCE_API_SECRET,
      NEXT_PUBLIC_BINANCE_REST_API: process.env.NEXT_PUBLIC_BINANCE_REST_API,
      NEXT_PUBLIC_BINANCE_WS_API: process.env.NEXT_PUBLIC_BINANCE_WS_API,
      BINANCE_TESTNET: process.env.BINANCE_TESTNET,
    })

    return {
      success: true as const,
      data: env,
      error: null,
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map(err => `${err.path.join('.')}: ${err.message}`)

      return {
        success: false as const,
        data: null,
        error: errorMessages.join('\n'),
      }
    }

    return {
      success: false as const,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * 环境变量验证结果
 */
export const envValidation = validateEnv()

/**
 * 类型安全的环境变量访问
 */
export const env = envValidation.success
  ? envValidation.data
  : {
      // 提供默认值以防止应用崩溃
      NODE_ENV: 'development' as const,
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      BINANCE_API_KEY: '',
      BINANCE_API_SECRET: '',
      NEXT_PUBLIC_BINANCE_REST_API: 'https://fapi.binance.com',
      NEXT_PUBLIC_BINANCE_WS_API: 'wss://fstream.binance.com/ws',
      BINANCE_TESTNET: false,
    }

/**
 * 是否为开发环境
 */
export const isDevelopment = env.NODE_ENV === 'development'

/**
 * 是否为生产环境
 */
export const isProduction = env.NODE_ENV === 'production'

/**
 * 是否使用测试网
 */
export const isTestnet = env.BINANCE_TESTNET === true

/**
 * 在开发环境下打印环境变量警告
 */
if (!envValidation.success && isDevelopment) {
}

/**
 * 在生产环境下，如果缺少必需的环境变量，抛出错误
 */
if (!envValidation.success && isProduction) {
  throw new Error(`环境变量验证失败:\n${envValidation.error}\n\n生产环境必须配置所有必需的环境变量`)
}
