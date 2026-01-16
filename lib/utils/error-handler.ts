/**
 * 类型守卫：检查值是否为 Error 实例
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error
}

/**
 * 类型守卫：检查值是否为具有 message 属性的对象
 */
export function hasMessage(error: unknown): error is { message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  )
}

/**
 * 安全地获取错误消息
 */
export function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message
  }

  if (hasMessage(error)) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  return '未知错误'
}

/**
 * 安全地获取错误堆栈
 */
export function getErrorStack(error: unknown): string | undefined {
  if (isError(error)) {
    return error.stack
  }

  return undefined
}

/**
 * 将未知错误转换为 Error 对象
 */
export function toError(error: unknown): Error {
  if (isError(error)) {
    return error
  }

  const message = getErrorMessage(error)
  const newError = new Error(message)
  const stack = getErrorStack(error)

  if (stack) {
    newError.stack = stack
  }

  return newError
}

/**
 * 用于 catch 块的错误处理函数
 */
export function handleCaughtError(error: unknown, _context?: string): void {
  if (isError(error) && error.stack) {
  }
}

/**
 * 币安 API 错误响应类型
 */
export interface BinanceErrorResponse {
  code: number
  msg: string
}

/**
 * 类型守卫：检查是否为币安 API 错误响应
 */
export function isBinanceErrorResponse(error: unknown): error is BinanceErrorResponse {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'msg' in error &&
    typeof (error as BinanceErrorResponse).code === 'number' &&
    typeof (error as BinanceErrorResponse).msg === 'string'
  )
}

/**
 * 获取币安 API 错误消息
 */
export function getBinanceErrorMessage(error: unknown): string {
  if (isBinanceErrorResponse(error)) {
    return `币安错误 [${error.code}]: ${error.msg}`
  }

  return getErrorMessage(error)
}
