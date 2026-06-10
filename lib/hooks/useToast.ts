import { toast as sonnerToast } from 'sonner'

type ToastType = 'success' | 'error' | 'info' | 'warning'

export const useToast = () => {
  const show = (type: ToastType, title: string, description?: string) => {
    sonnerToast[type](title, { description })
  }

  return {
    success: (title: string, description?: string) => show('success', title, description),
    error: (title: string, description?: string) => show('error', title, description),
    info: (title: string, description?: string) => show('info', title, description),
    warning: (title: string, description?: string) => show('warning', title, description)
  }
}