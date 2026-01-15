/**
 * useIsMounted Hook
 *
 * 用于检查组件是否已挂载
 */

import { useState, useEffect } from 'react'

/* eslint-disable react-hooks/set-state-in-effect */

export function useIsMounted() {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  return isMounted
}
