/**
 * 对话框焦点管理 Hook
 *
 * 统一处理初始焦点、键盘焦点循环、Esc 关闭、背景滚动锁定和关闭后的焦点归还。
 */

'use client'

import {
  useCallback,
  useEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

interface UseDialogFocusOptions {
  /** 关闭对话框 */
  onClose: () => void
  /** 对话框是否已打开 */
  isOpen?: boolean
  /** 首次打开时优先聚焦的元素 */
  initialFocusRef?: RefObject<HTMLElement | null>
  /** 是否锁定页面背景滚动 */
  lockBodyScroll?: boolean
}

interface UseDialogFocusResult<T extends HTMLElement> {
  /** 对话框根节点引用 */
  dialogRef: RefObject<T | null>
  /** 绑定到对话框根节点的键盘事件 */
  onDialogKeyDown: (event: ReactKeyboardEvent<T>) => void
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    element =>
      !element.hasAttribute('hidden') &&
      element.getAttribute('aria-hidden') !== 'true' &&
      element.getClientRects().length > 0
  )
}

/**
 * 为模态对话框提供一致的键盘与焦点行为。
 */
export function useDialogFocus<T extends HTMLElement = HTMLElement>({
  onClose,
  isOpen = true,
  initialFocusRef,
  lockBodyScroll = true,
}: UseDialogFocusOptions): UseDialogFocusResult<T> {
  const dialogRef = useRef<T>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)

  const onDialogKeyDown = useCallback(
    (event: ReactKeyboardEvent<T>) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onClose()
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) {
        return
      }

      const focusableElements = getFocusableElements(dialogRef.current)
      if (focusableElements.length === 0) {
        event.preventDefault()
        dialogRef.current.focus()
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    },
    [onClose]
  )

  useEffect(() => {
    if (!isOpen) {
      return
    }

    returnFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    const previousOverflow = document.body.style.overflow
    if (lockBodyScroll) {
      document.body.style.overflow = 'hidden'
    }

    const focusFrame = window.requestAnimationFrame(() => {
      const dialog = dialogRef.current
      if (!dialog) {
        return
      }

      const focusTarget = initialFocusRef?.current ?? getFocusableElements(dialog)[0] ?? dialog
      focusTarget.focus()
    })

    return () => {
      window.cancelAnimationFrame(focusFrame)
      if (lockBodyScroll) {
        document.body.style.overflow = previousOverflow
      }

      if (returnFocusRef.current?.isConnected) {
        returnFocusRef.current.focus()
      }
    }
  }, [initialFocusRef, isOpen, lockBodyScroll])

  return { dialogRef, onDialogKeyDown }
}
