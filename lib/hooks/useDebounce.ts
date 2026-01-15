/**
 * useDebounce Hook
 *
 * 用于防抖处理的自定义 Hook
 */

import { useEffect, useState } from 'react'

/**
 * 防抖 Hook
 *
 * @param value - 需要防抖的值
 * @param delay - 延迟时间（毫秒）
 * @returns 防抖后的值
 *
 * @example
 * ```tsx
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearchTerm = useDebounce(searchTerm, 500);
 *
 * useEffect(() => {
 *   // 使用 debouncedSearchTerm 进行搜索
 *   search(debouncedSearchTerm);
 * }, [debouncedSearchTerm]);
 * ```
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    // 设置定时器
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // 清除定时器
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * 防抖回调 Hook
 *
 * @param callback - 需要防抖的回调函数
 * @param delay - 延迟时间（毫秒）
 * @param deps - 依赖数组
 * @returns 防抖后的回调函数
 *
 * @example
 * ```tsx
 * const debouncedSearch = useDebouncedCallback(
 *   (query: string) => {
 *     search(query);
 *   },
 *   500,
 *   []
 * );
 * ```
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number = 500,
  deps: unknown[] = []
): T {
  const [debouncedValue, setDebouncedValue] = useState<(() => void) | null>(null)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(() => callback)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callback, delay, ...deps])

  return (debouncedValue || callback) as unknown as T
}
