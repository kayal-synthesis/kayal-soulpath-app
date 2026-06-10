'use client'

import { createContext, useContext, forwardRef } from 'react'
import { useForm, FormProvider, UseFormReturn, FieldValues, SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { cn } from '@/lib/utils/cn'

// Form Context
interface FormContextValue {
  size?: 'sm' | 'md' | 'lg'
  layout?: 'vertical' | 'horizontal'
  disabled?: boolean
  readOnly?: boolean
}

const FormContext = createContext<FormContextValue>({})

// Root Form Component
interface FormProps<T extends FieldValues> {
  form: UseFormReturn<T>
  onSubmit: SubmitHandler<T>
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg'
  layout?: 'vertical' | 'horizontal'
  disabled?: boolean
  readOnly?: boolean
}

export const Form = <T extends FieldValues>({
  form,
  onSubmit,
  children,
  className = '',
  size = 'md',
  layout = 'vertical',
  disabled = false,
  readOnly = false
}: FormProps<T>) => {
  return (
    <FormContext.Provider value={{ size, layout, disabled, readOnly }}>
      <FormProvider {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className={cn('space-y-6', className)}
        >
          {children}
        </form>
      </FormProvider>
    </FormContext.Provider>
  )
}

// Form Field Component
interface FormFieldProps {
  name: string
  label?: string
  description?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}

export const FormField = ({
  name,
  label,
  description,
  required = false,
  children,
  className = ''
}: FormFieldProps) => {
  const { size, layout, disabled, readOnly } = useContext(FormContext)
  const form = useFormContext()
  const error = form.formState.errors[name]?.message as string | undefined

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  return (
    <div className={cn(
      layout === 'horizontal' && 'flex items-start gap-4',
      className
    )}>
      {label && (
        <div className={cn(
          layout === 'horizontal' ? 'w-1/3' : 'mb-2'
        )}>
          <label
            htmlFor={name}
            className={cn(
              'block font-medium text-neutral-700',
              sizeClasses[size || 'md']
            )}
          >
            {label}
            {required && <span className="ml-1 text-warning">*</span>}
          </label>
          {description && (
            <p className={cn(
              'text-neutral-500 mt-1',
              sizeClasses[size || 'md']
            )}>
              {description}
            </p>
          )}
        </div>
      )}
      
      <div className={cn(layout === 'horizontal' ? 'w-2/3' : 'w-full')}>
        {children}
        {error && (
          <p className={cn(
            'mt-1 text-warning',
            sizeClasses[size || 'md']
          )}>
            {error}
          </p>
        )}
      </div>
    </div>
  )
}

// Form Actions Component
interface FormActionsProps {
  children: React.ReactNode
  align?: 'left' | 'center' | 'right'
  className?: string
}

export const FormActions = ({
  children,
  align = 'right',
  className = ''
}: FormActionsProps) => {
  return (
    <div className={cn(
      'flex gap-3',
      align === 'center' && 'justify-center',
      align === 'right' && 'justify-end',
      className
    )}>
      {children}
    </div>
  )
}

// Helper hook to use form context with types
export const useFormContext = <T extends FieldValues>() => {
  const context = useContext(FormContext)
  const form = useContext(FormProvider as any) as UseFormReturn<T>
  
  if (!form) {
    throw new Error('useFormContext must be used within a FormProvider')
  }

  return { ...form, ...context }
}

// Create form with zod schema
export const createForm = <T extends z.ZodType>(schema: T) => {
  type FormData = z.infer<T>

  return {
    useForm: (defaultValues?: Partial<FormData>) => 
      useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues
      })
  }
}