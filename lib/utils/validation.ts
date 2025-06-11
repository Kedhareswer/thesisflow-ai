export interface ValidationRule<T = any> {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  custom?: (value: T) => string | null
}

export interface ValidationResult {
  isValid: boolean
  errors: Record<string, string>
}

export function validateField(value: any, rules: ValidationRule): string | null {
  if (rules.required && (!value || value.toString().trim() === "")) {
    return "This field is required"
  }

  if (value && rules.minLength && value.toString().length < rules.minLength) {
    return `Minimum length is ${rules.minLength} characters`
  }

  if (value && rules.maxLength && value.toString().length > rules.maxLength) {
    return `Maximum length is ${rules.maxLength} characters`
  }

  if (value && rules.pattern && !rules.pattern.test(value.toString())) {
    return "Invalid format"
  }

  if (rules.custom) {
    return rules.custom(value)
  }

  return null
}

export function validateForm(data: Record<string, any>, rules: Record<string, ValidationRule>): ValidationResult {
  const errors: Record<string, string> = {}

  for (const [field, fieldRules] of Object.entries(rules)) {
    const error = validateField(data[field], fieldRules)
    if (error) {
      errors[field] = error
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

// Common validation patterns
export const validationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  url: /^https?:\/\/.+/,
  phone: /^\+?[\d\s-()]+$/,
}
