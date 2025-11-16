'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { X, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react'

type AlertType = 'info' | 'success' | 'warning' | 'error'

interface AlertOptions {
  title?: string
  message: string
  type?: AlertType
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void
  onCancel?: () => void
}

interface AlertContextType {
  showAlert: (options: AlertOptions) => Promise<boolean>
  showConfirm: (options: AlertOptions) => Promise<boolean>
}

const AlertContext = createContext<AlertContextType | undefined>(undefined)

export function AlertProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<AlertOptions & { isConfirm?: boolean } | null>(null)
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null)

  const showAlert = (opts: AlertOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setOptions({ ...opts, isConfirm: false })
      setIsOpen(true)
      setResolvePromise(() => resolve)
    })
  }

  const showConfirm = (opts: AlertOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setOptions({ ...opts, isConfirm: true })
      setIsOpen(true)
      setResolvePromise(() => resolve)
    })
  }

  const handleConfirm = () => {
    if (options?.onConfirm) {
      options.onConfirm()
    }
    if (resolvePromise) {
      resolvePromise(true)
    }
    setIsOpen(false)
    setOptions(null)
    setResolvePromise(null)
  }

  const handleCancel = () => {
    if (options?.onCancel) {
      options.onCancel()
    }
    if (resolvePromise) {
      resolvePromise(false)
    }
    setIsOpen(false)
    setOptions(null)
    setResolvePromise(null)
  }

  const getIcon = () => {
    const type = options?.type || 'info'
    const iconClass = 'w-6 h-6'
    
    switch (type) {
      case 'success':
        return <CheckCircle2 className={`${iconClass} text-green-500`} />
      case 'warning':
        return <AlertTriangle className={`${iconClass} text-yellow-500`} />
      case 'error':
        return <AlertCircle className={`${iconClass} text-red-500`} />
      default:
        return <AlertCircle className={`${iconClass} text-cyan-500`} />
    }
  }

  const getButtonColor = () => {
    const type = options?.type || 'info'
    
    switch (type) {
      case 'success':
        return 'bg-green-600 hover:bg-green-700'
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700'
      case 'error':
        return 'bg-red-600 hover:bg-red-700'
      default:
        return 'bg-cyan-600 hover:bg-cyan-700'
    }
  }

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      {isOpen && options && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg max-w-md w-full shadow-2xl">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  {getIcon()}
                </div>
                <div className="flex-1">
                  {options.title && (
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {options.title}
                    </h3>
                  )}
                  <p className="text-slate-300 whitespace-pre-line">
                    {options.message}
                  </p>
                </div>
                {!options.isConfirm && (
                  <button
                    onClick={handleCancel}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
            <div className="bg-slate-700 px-6 py-4 flex justify-end gap-3 rounded-b-lg">
              {options.isConfirm ? (
                <>
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    className="bg-slate-600 hover:bg-slate-500 text-white"
                  >
                    {options.cancelText || 'Cancelar'}
                  </Button>
                  <Button
                    onClick={handleConfirm}
                    className={`${getButtonColor()} text-white`}
                  >
                    {options.confirmText || 'Confirmar'}
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleConfirm}
                  className={`${getButtonColor()} text-white`}
                >
                  {options.confirmText || 'OK'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </AlertContext.Provider>
  )
}

export function useAlert() {
  const context = useContext(AlertContext)
  if (!context) {
    throw new Error('useAlert must be used within AlertProvider')
  }
  return context
}

