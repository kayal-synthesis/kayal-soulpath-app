'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: any[] = []
): T {
  const timeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return useCallback(
    ((...args: any[]) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args)
      }, delay)
    }) as T,
    [delay, ...deps]
  )
}

export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  limit: number,
  deps: any[] = []
): T {
  const inThrottleRef = useRef(false)
  const lastArgsRef = useRef<any[]>()
  const timeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return useCallback(
    ((...args: any[]) => {
      if (!inThrottleRef.current) {
        callback(...args)
        inThrottleRef.current = true

        timeoutRef.current = setTimeout(() => {
          inThrottleRef.current = false
          if (lastArgsRef.current) {
            callback(...lastArgsRef.current)
            lastArgsRef.current = undefined
          }
        }, limit)
      } else {
        lastArgsRef.current = args
      }
    }) as T,
    [limit, ...deps]
  )
}

export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export function useDebouncedEffect(
  effect: () => void | (() => void),
  delay: number,
  deps: any[] = []
) {
  const callback = useCallback(effect, deps)

  useEffect(() => {
    const handler = setTimeout(() => {
      callback()
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [callback, delay])
}

export function useDebouncedState<T>(
  initialState: T | (() => T),
  delay: number
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState(initialState)
  const [debouncedState, setDebouncedState] = useState(state)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedState(state)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [state, delay])

  return [debouncedState, setState]
}