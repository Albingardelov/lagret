import '@testing-library/jest-dom'
import 'jest-axe/extend-expect'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from './mocks/server'

// Mantine Modal/ScrollArea använder ResizeObserver – jsdom implementerar det inte
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mantine använder window.matchMedia för dark mode – jsdom implementerar det inte
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
