import { useState, useCallback } from 'react'

export function useModal(initialOpen = false) {
  const [isOpen, setIsOpen] = useState(initialOpen)
  const [data, setData] = useState<any>(null)

  const open = useCallback((modalData?: any) => {
    setIsOpen(true)
    setData(modalData)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    setData(null)
  }, [])

  const toggle = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  return { isOpen, data, open, close, toggle }
}