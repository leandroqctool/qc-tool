import '@testing-library/jest-dom'

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock matchMedia
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
}

// Mock fetch
global.fetch = jest.fn()

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return ''
  },
}))

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession() {
    return {
      data: {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
          tenantId: 'test-tenant-id',
          role: 'admin'
        }
      },
      status: 'authenticated'
    }
  },
  SessionProvider: ({ children }) => children,
  signIn: jest.fn(),
  signOut: jest.fn(),
}))

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  __esModule: true,
  ...Object.fromEntries(
    [
      'Home', 'Folder', 'Grid3X3', 'Users', 'CheckCircle', 'FileText', 'BarChart3',
      'Shield', 'ChevronLeft', 'ChevronRight', 'Plus', 'Search', 'Bell', 'Settings',
      'LogOut', 'Upload', 'Download', 'Eye', 'Edit', 'Trash2', 'MoreHorizontal',
      'Calendar', 'Clock', 'MapPin', 'Phone', 'Mail', 'AlertTriangle', 'Info',
      'X', 'Check', 'ChevronDown', 'ChevronUp', 'ArrowRight', 'ArrowLeft',
      'Star', 'Heart', 'Share', 'Copy', 'Link', 'ExternalLink', 'Refresh',
      'Loader', 'Spinner', 'Activity', 'TrendingUp', 'TrendingDown', 'Target',
      'Award', 'Zap', 'Briefcase', 'Monitor', 'Smartphone', 'Globe', 'Lock',
      'Key', 'QrCode', 'MessageSquare', 'Send', 'Image', 'File', 'Paperclip'
    ].map(name => [
      name,
      ({ children, ...props }) => 
        React.createElement('svg', { 'data-testid': name.toLowerCase(), ...props }, children)
    ])
  )
}))

// Suppress console warnings in tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
       args[0].includes('Warning: An invalid form control'))
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})
