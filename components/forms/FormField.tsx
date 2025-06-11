"use client"

import { forwardRef } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface BaseFieldProps {
  label: string
  error?: string
  required?: boolean
  className?: string
  description?: string
}

interface InputFieldProps extends BaseFieldProps {
  type?: "text" | "email" | "password" | "url" | "number"
  placeholder?: string
  value: string
  onChange: (value: string) => void
}

interface TextareaFieldProps extends BaseFieldProps {
  placeholder?: string
  value: string
  onChange: (value: string) => void
  rows?: number
}

export const FormField = forwardRef<HTMLInputElement, InputFieldProps>(
  ({ label, error, required, className, description, type = "text", ...props }, ref) => {
    return (
      <div className={cn("space-y-2", className)}>
        <Label className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        {description && <p className="text-xs text-gray-600">{description}</p>}
        <Input
          ref={ref}
          type={type}
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          placeholder={props.placeholder}
          className={cn(error && "border-red-500")}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    )
  },
)

FormField.displayName = "FormField"

export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  ({ label, error, required, className, description, rows = 3, ...props }, ref) => {
    return (
      <div className={cn("space-y-2", className)}>
        <Label className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        {description && <p className="text-xs text-gray-600">{description}</p>}
        <Textarea
          ref={ref}
          rows={rows}
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          placeholder={props.placeholder}
          className={cn(error && "border-red-500")}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    )
  },
)

TextareaField.displayName = "TextareaField"
