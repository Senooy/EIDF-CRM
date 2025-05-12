import * as React from 'react'

/**
 * A React hook that tracks the state of a CSS media query.
 *
 * @param query The media query string to watch.
 * @returns `true` if the media query matches, `false` otherwise.
 *
 * @example
 * const isDesktop = useMediaQuery("(min-width: 768px)")
 */
export function useMediaQuery(query: string) {
  const [value, setValue] = React.useState(false)

  React.useEffect(() => {
    function onChange(event: MediaQueryListEvent) {
      setValue(event.matches)
    }

    const result = matchMedia(query)
    result.addEventListener("change", onChange)
    setValue(result.matches)

    return () => result.removeEventListener("change", onChange)
  }, [query])

  return value
} 