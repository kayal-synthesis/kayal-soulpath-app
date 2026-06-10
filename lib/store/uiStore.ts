import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'system'
export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

export interface Modal {
  id: string
  type: string
  props?: Record<string, any>
  onClose?: () => void
}

export interface SidebarState {
  isOpen: boolean
  isCollapsed: boolean
  activeItem?: string
}

interface UIState {
  // Theme
  theme: Theme
  setTheme: (theme: Theme) => void
  
  // Sidebar
  sidebar: SidebarState
  toggleSidebar: () => void
  toggleSidebarCollapse: () => void
  setSidebarOpen: (isOpen: boolean) => void
  setActiveSidebarItem: (item: string) => void
  
  // Toasts
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => string
  removeToast: (id: string) => void
  clearToasts: () => void
  
  // Modals
  modals: Modal[]
  openModal: (type: string, props?: Record<string, any>) => string
  closeModal: (id: string) => void
  closeAllModals: () => void
  
  // Loading States
  loadingStates: Record<string, boolean>
  setLoading: (key: string, isLoading: boolean) => void
  isLoading: (key: string) => boolean
  
  // Notifications
  notifications: Array<{
    id: string
    title: string
    message?: string
    type: 'info' | 'success' | 'warning' | 'error'
    read: boolean
    createdAt: string
  }>
  addNotification: (notification: Omit<any, 'id' | 'read' | 'createdAt'>) => void
  markNotificationAsRead: (id: string) => void
  markAllNotificationsAsRead: () => void
  clearNotifications: () => void
  
  // Search
  searchQuery: string
  setSearchQuery: (query: string) => void
  clearSearch: () => void
  
  // Breadcrumbs
  breadcrumbs: Array<{ label: string; href?: string }>
  setBreadcrumbs: (breadcrumbs: Array<{ label: string; href?: string }>) => void
  addBreadcrumb: (breadcrumb: { label: string; href?: string }) => void
  clearBreadcrumbs: () => void
  
  // Viewport
  viewport: {
    width: number
    height: number
    isMobile: boolean
    isTablet: boolean
    isDesktop: boolean
  }
  setViewport: (width: number, height: number) => void
  
  // Reset
  resetUI: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Theme
      theme: 'system',
      setTheme: (theme) => set({ theme }),

      // Sidebar
      sidebar: {
        isOpen: true,
        isCollapsed: false,
        activeItem: undefined
      },
      toggleSidebar: () => set((state) => ({
        sidebar: { ...state.sidebar, isOpen: !state.sidebar.isOpen }
      })),
      toggleSidebarCollapse: () => set((state) => ({
        sidebar: { ...state.sidebar, isCollapsed: !state.sidebar.isCollapsed }
      })),
      setSidebarOpen: (isOpen) => set((state) => ({
        sidebar: { ...state.sidebar, isOpen }
      })),
      setActiveSidebarItem: (item) => set((state) => ({
        sidebar: { ...state.sidebar, activeItem: item }
      })),

      // Toasts
      toasts: [],
      addToast: (toast) => {
        const id = Math.random().toString(36).substr(2, 9)
        set((state) => ({
          toasts: [...state.toasts, { ...toast, id }]
        }))
        
        // Auto-remove after duration
        if (toast.duration !== 0) {
          setTimeout(() => {
            get().removeToast(id)
          }, toast.duration || 5000)
        }
        
        return id
      },
      removeToast: (id) => set((state) => ({
        toasts: state.toasts.filter(t => t.id !== id)
      })),
      clearToasts: () => set({ toasts: [] }),

      // Modals
      modals: [],
      openModal: (type, props = {}) => {
        const id = Math.random().toString(36).substr(2, 9)
        set((state) => ({
          modals: [...state.modals, { id, type, props }]
        }))
        return id
      },
      closeModal: (id) => {
        const modal = get().modals.find(m => m.id === id)
        if (modal?.onClose) modal.onClose()
        set((state) => ({
          modals: state.modals.filter(m => m.id !== id)
        }))
      },
      closeAllModals: () => {
        get().modals.forEach(modal => modal.onClose?.())
        set({ modals: [] })
      },

      // Loading States
      loadingStates: {},
      setLoading: (key, isLoading) => set((state) => ({
        loadingStates: { ...state.loadingStates, [key]: isLoading }
      })),
      isLoading: (key) => get().loadingStates[key] || false,

      // Notifications
      notifications: [],
      addNotification: (notification) => set((state) => ({
        notifications: [
          {
            id: Math.random().toString(36).substr(2, 9),
            ...notification,
            read: false,
            createdAt: new Date().toISOString()
          },
          ...state.notifications
        ]
      })),
      markNotificationAsRead: (id) => set((state) => ({
        notifications: state.notifications.map(n =>
          n.id === id ? { ...n, read: true } : n
        )
      })),
      markAllNotificationsAsRead: () => set((state) => ({
        notifications: state.notifications.map(n => ({ ...n, read: true }))
      })),
      clearNotifications: () => set({ notifications: [] }),

      // Search
      searchQuery: '',
      setSearchQuery: (query) => set({ searchQuery: query }),
      clearSearch: () => set({ searchQuery: '' }),

      // Breadcrumbs
      breadcrumbs: [],
      setBreadcrumbs: (breadcrumbs) => set({ breadcrumbs }),
      addBreadcrumb: (breadcrumb) => set((state) => ({
        breadcrumbs: [...state.breadcrumbs, breadcrumb]
      })),
      clearBreadcrumbs: () => set({ breadcrumbs: [] }),

      // Viewport
      viewport: {
        width: typeof window !== 'undefined' ? window.innerWidth : 0,
        height: typeof window !== 'undefined' ? window.innerHeight : 0,
        isMobile: false,
        isTablet: false,
        isDesktop: true
      },
      setViewport: (width, height) => set({
        viewport: {
          width,
          height,
          isMobile: width < 640,
          isTablet: width >= 640 && width < 1024,
          isDesktop: width >= 1024
        }
      }),

      // Reset
      resetUI: () => set({
        theme: 'system',
        sidebar: { isOpen: true, isCollapsed: false, activeItem: undefined },
        toasts: [],
        modals: [],
        loadingStates: {},
        notifications: [],
        searchQuery: '',
        breadcrumbs: []
      })
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        theme: state.theme,
        sidebar: {
          isCollapsed: state.sidebar.isCollapsed
        }
      })
    }
  )
)