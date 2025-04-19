"use client"

import type { ReactNode } from "react"
import { FormProvider, useForm } from "react-hook-form"

interface FormWrapperProps {
  children: ReactNode
  defaultValues?: Record<string, any>
}

export function FormWrapper({ children, defaultValues = {} }: FormWrapperProps) {
  const methods = useForm({
    defaultValues,
  })

  return <FormProvider {...methods}>{children}</FormProvider>
}
