/**
 * API 输入验证 Schema
 *
 * 使用 Zod 定义和验证 API 输入参数
 */

import { z } from 'zod'

/**
 * 通用交易对 Schema
 */
export const symbolSchema = z
  .string()
  .min(1, 'Symbol is required')
  .regex(/^[A-Z]+USDT$/, 'Symbol must be in format XXXUSDT')
  .transform(val => val.toUpperCase())

/**
 * 查询参数 Schema
 */
export const queryParamsSchema = z.object({
  symbol: symbolSchema.optional(),
  limit: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val, 10) : undefined))
    .pipe(
      z
        .number()
        .int('Limit must be an integer')
        .min(1, 'Limit must be at least 1')
        .max(1000, 'Limit cannot exceed 1000')
        .optional()
    ),
  startTime: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val, 10) : undefined))
    .pipe(z.number().int().positive().optional()),
  endTime: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val, 10) : undefined))
    .pipe(z.number().int().positive().optional()),
})

/**
 * 持仓查询参数 Schema
 */
export const positionsQuerySchema = z.object({
  symbol: symbolSchema.optional(),
  onlyActive: z
    .string()
    .optional()
    .transform(val => val === 'true')
    .optional(),
})

/**
 * 订单查询参数 Schema
 */
export const ordersQuerySchema = z.object({
  symbol: symbolSchema.optional(),
  limit: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val, 10) : 50))
    .pipe(
      z
        .number()
        .int('Limit must be an integer')
        .min(1, 'Limit must be at least 1')
        .max(1000, 'Limit cannot exceed 1000')
    ),
  page: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int('Page must be an integer').min(1, 'Page must be at least 1')),
  startTime: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val, 10) : undefined))
    .pipe(z.number().int().positive().optional()),
  endTime: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val, 10) : undefined))
    .pipe(z.number().int().positive().optional()),
})

/**
 * 用户成交记录查询参数 Schema
 */
export const userTradesQuerySchema = z.object({
  symbol: symbolSchema.optional(),
  limit: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val, 10) : 50))
    .pipe(
      z
        .number()
        .int('Limit must be an integer')
        .min(1, 'Limit must be at least 1')
        .max(1000, 'Limit cannot exceed 1000')
    ),
  startTime: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val, 10) : undefined))
    .pipe(z.number().int().positive().optional()),
  endTime: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val, 10) : undefined))
    .pipe(z.number().int().positive().optional()),
})

/**
 * WebSocket 监听 Key 操作 Schema
 */
export const listenKeyActionSchema = z.enum(['start', 'keepAlive', 'stop'])

/**
 * 验证 URL 查询参数
 */
export function validateQueryParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): {
  success: boolean
  data?: T
  error?: string
  errors?: z.ZodError
} {
  try {
    // 将 URLSearchParams 转换为普通对象
    const params = Object.fromEntries(searchParams.entries())

    // 验证并转换参数
    const data = schema.parse(params)

    return {
      success: true,
      data,
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map(err => ({
        path: err.path.join('.'),
        message: err.message,
      }))

      return {
        success: false,
        error: `Validation failed: ${JSON.stringify(errorMessages)}`,
        errors: error,
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown validation error',
    }
  }
}

/**
 * 从 Zod 错误生成 Next.js 响应
 */
export function validationErrorResponse<T>(validation: ReturnType<typeof validateQueryParams<T>>) {
  if (validation.success) {
    return null
  }

  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code: -1,
        message: validation.error,
        details: validation.errors?.issues,
      },
    }),
    {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  )
}
