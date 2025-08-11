// Dynamic form builder system - Workfront-style forms
export type FormFieldType = 
  | 'text' 
  | 'textarea' 
  | 'number'
  | 'email'
  | 'phone'
  | 'url'
  | 'date'
  | 'datetime'
  | 'time'
  | 'select'
  | 'multiselect'
  | 'radio'
  | 'checkbox'
  | 'file'
  | 'signature'
  | 'rating'
  | 'slider'
  | 'color'
  | 'section'
  | 'html'

export interface FormFieldOption {
  id: string
  label: string
  value: string
  color?: string
}

export interface FormFieldValidation {
  required?: boolean
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  pattern?: string
  customMessage?: string
}

export interface FormFieldConditional {
  fieldId: string
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty'
  value: string | number | boolean
  action: 'show' | 'hide' | 'require' | 'disable'
}

export interface FormField {
  id: string
  type: FormFieldType
  label: string
  description?: string
  placeholder?: string
  defaultValue?: string | number | boolean | string[]
  required?: boolean
  validation?: FormFieldValidation
  options?: FormFieldOption[]
  conditionals?: FormFieldConditional[]
  layout?: {
    width: 'full' | 'half' | 'third' | 'quarter'
    order: number
  }
  settings?: {
    allowMultiple?: boolean
    maxFiles?: number
    acceptedTypes?: string[]
    showTime?: boolean
    format?: string
    min?: number
    max?: number
    step?: number
    rows?: number
    cols?: number
    richText?: boolean
  }
}

export interface FormSection {
  id: string
  title: string
  description?: string
  fields: FormField[]
  collapsible?: boolean
  collapsed?: boolean
  conditional?: FormFieldConditional[]
}

export interface FormTemplate {
  id: string
  name: string
  description?: string
  category: string
  version: number
  sections: FormSection[]
  settings: {
    allowDrafts: boolean
    requireLogin: boolean
    multiPage: boolean
    showProgress: boolean
    submitButtonText: string
    successMessage: string
    redirectUrl?: string
    notificationEmails?: string[]
    saveProgress: boolean
    allowEditing: boolean
  }
  styling: {
    theme: 'light' | 'dark' | 'custom'
    primaryColor?: string
    backgroundColor?: string
    textColor?: string
    fontFamily?: string
    borderRadius?: number
    spacing: 'compact' | 'normal' | 'spacious'
  }
  createdBy: string
  createdAt: Date
  updatedAt: Date
  isActive: boolean
  isPublic: boolean
  tags: string[]
}

export interface FormSubmission {
  id: string
  formId: string
  formVersion: number
  data: Record<string, unknown>
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'pending'
  submittedBy?: string
  submittedAt?: Date
  reviewedBy?: string
  reviewedAt?: Date
  reviewComments?: string
  metadata: {
    userAgent?: string
    ipAddress?: string
    referrer?: string
    sessionId?: string
    completionTime?: number
    pageViews?: number
  }
  attachments?: {
    fieldId: string
    fileName: string
    fileUrl: string
    fileSize: number
    mimeType: string
  }[]
}

export interface FormWorkflow {
  id: string
  name: string
  formId: string
  stages: {
    id: string
    name: string
    description?: string
    assignees: string[]
    actions: ('approve' | 'reject' | 'request_changes' | 'assign')[]
    autoAdvance?: boolean
    timeLimit?: number
    notifications: {
      onEntry?: string[]
      onApproval?: string[]
      onRejection?: string[]
      onTimeout?: string[]
    }
  }[]
  rules: {
    id: string
    condition: string // JavaScript expression
    action: 'advance' | 'reject' | 'notify' | 'assign'
    target?: string
  }[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// Form field validation functions
export function validateField(field: FormField, value: unknown): string[] {
  const errors: string[] = []
  const validation = field.validation

  if (!validation) return errors

  // Required validation
  if (validation.required && (value === undefined || value === null || value === '')) {
    errors.push(validation.customMessage || `${field.label} is required`)
    return errors // Don't validate further if required and empty
  }

  // Skip other validations if value is empty and not required
  if (value === undefined || value === null || value === '') {
    return errors
  }

  // String validations
  if (typeof value === 'string') {
    if (validation.minLength && value.length < validation.minLength) {
      errors.push(`${field.label} must be at least ${validation.minLength} characters`)
    }
    if (validation.maxLength && value.length > validation.maxLength) {
      errors.push(`${field.label} must be no more than ${validation.maxLength} characters`)
    }
    if (validation.pattern) {
      const regex = new RegExp(validation.pattern)
      if (!regex.test(value)) {
        errors.push(validation.customMessage || `${field.label} format is invalid`)
      }
    }
  }

  // Number validations
  if (typeof value === 'number') {
    if (validation.min !== undefined && value < validation.min) {
      errors.push(`${field.label} must be at least ${validation.min}`)
    }
    if (validation.max !== undefined && value > validation.max) {
      errors.push(`${field.label} must be no more than ${validation.max}`)
    }
  }

  return errors
}

// Evaluate conditional logic
export function evaluateConditional(
  conditional: FormFieldConditional,
  formData: Record<string, unknown>
): boolean {
  const fieldValue = formData[conditional.fieldId]
  const conditionValue = conditional.value

  switch (conditional.operator) {
    case 'equals':
      return fieldValue === conditionValue
    case 'not_equals':
      return fieldValue !== conditionValue
    case 'contains':
      return String(fieldValue || '').includes(String(conditionValue))
    case 'not_contains':
      return !String(fieldValue || '').includes(String(conditionValue))
    case 'greater_than':
      return Number(fieldValue) > Number(conditionValue)
    case 'less_than':
      return Number(fieldValue) < Number(conditionValue)
    case 'is_empty':
      return !fieldValue || fieldValue === '' || (Array.isArray(fieldValue) && fieldValue.length === 0)
    case 'is_not_empty':
      return !!fieldValue && fieldValue !== '' && (!Array.isArray(fieldValue) || fieldValue.length > 0)
    default:
      return false
  }
}

// Check if field should be visible based on conditionals
export function isFieldVisible(field: FormField, formData: Record<string, unknown>): boolean {
  if (!field.conditionals || field.conditionals.length === 0) return true

  for (const conditional of field.conditionals) {
    const result = evaluateConditional(conditional, formData)
    
    if (conditional.action === 'show' && result) return true
    if (conditional.action === 'hide' && result) return false
  }

  return true
}

// Check if field should be required based on conditionals
export function isFieldRequired(field: FormField, formData: Record<string, unknown>): boolean {
  let required = field.required || false

  if (field.conditionals) {
    for (const conditional of field.conditionals) {
      const result = evaluateConditional(conditional, formData)
      
      if (conditional.action === 'require' && result) {
        required = true
      }
    }
  }

  return required
}

// Check if field should be disabled based on conditionals
export function isFieldDisabled(field: FormField, formData: Record<string, unknown>): boolean {
  if (!field.conditionals) return false

  for (const conditional of field.conditionals) {
    const result = evaluateConditional(conditional, formData)
    
    if (conditional.action === 'disable' && result) return true
  }

  return false
}

// Validate entire form
export function validateForm(template: FormTemplate, data: Record<string, unknown>): {
  isValid: boolean
  errors: Record<string, string[]>
  fieldErrors: Record<string, string[]>
} {
  const errors: Record<string, string[]> = {}
  const fieldErrors: Record<string, string[]> = {}

  for (const section of template.sections) {
    for (const field of section.fields) {
      if (!isFieldVisible(field, data)) continue

      const fieldIsRequired = isFieldRequired(field, data)
      const fieldWithRequiredOverride = { ...field, required: fieldIsRequired }
      
      const fieldValidationErrors = validateField(fieldWithRequiredOverride, data[field.id])
      
      if (fieldValidationErrors.length > 0) {
        fieldErrors[field.id] = fieldValidationErrors
        errors[section.id] = errors[section.id] || []
        errors[section.id].push(...fieldValidationErrors)
      }
    }
  }

  return {
    isValid: Object.keys(fieldErrors).length === 0,
    errors,
    fieldErrors
  }
}

// Generate form field ID
export function generateFieldId(): string {
  return `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Generate section ID
export function generateSectionId(): string {
  return `section_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Default field configurations
export const DEFAULT_FIELD_CONFIGS: Record<FormFieldType, Partial<FormField>> = {
  text: {
    label: 'Text Input',
    placeholder: 'Enter text...',
    layout: { width: 'full', order: 0 }
  },
  textarea: {
    label: 'Text Area',
    placeholder: 'Enter detailed text...',
    layout: { width: 'full', order: 0 },
    settings: { rows: 4 }
  },
  number: {
    label: 'Number Input',
    placeholder: 'Enter number...',
    layout: { width: 'half', order: 0 }
  },
  email: {
    label: 'Email Address',
    placeholder: 'Enter email address...',
    layout: { width: 'half', order: 0 },
    validation: { pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' }
  },
  phone: {
    label: 'Phone Number',
    placeholder: 'Enter phone number...',
    layout: { width: 'half', order: 0 }
  },
  url: {
    label: 'Website URL',
    placeholder: 'https://example.com',
    layout: { width: 'half', order: 0 },
    validation: { pattern: '^https?:\\/\\/.+' }
  },
  date: {
    label: 'Date',
    layout: { width: 'third', order: 0 }
  },
  datetime: {
    label: 'Date & Time',
    layout: { width: 'half', order: 0 }
  },
  time: {
    label: 'Time',
    layout: { width: 'third', order: 0 }
  },
  select: {
    label: 'Dropdown',
    layout: { width: 'half', order: 0 },
    options: [
      { id: '1', label: 'Option 1', value: 'option1' },
      { id: '2', label: 'Option 2', value: 'option2' }
    ]
  },
  multiselect: {
    label: 'Multi-Select',
    layout: { width: 'half', order: 0 },
    options: [
      { id: '1', label: 'Option 1', value: 'option1' },
      { id: '2', label: 'Option 2', value: 'option2' }
    ]
  },
  radio: {
    label: 'Radio Buttons',
    layout: { width: 'full', order: 0 },
    options: [
      { id: '1', label: 'Option 1', value: 'option1' },
      { id: '2', label: 'Option 2', value: 'option2' }
    ]
  },
  checkbox: {
    label: 'Checkboxes',
    layout: { width: 'full', order: 0 },
    options: [
      { id: '1', label: 'Option 1', value: 'option1' },
      { id: '2', label: 'Option 2', value: 'option2' }
    ]
  },
  file: {
    label: 'File Upload',
    layout: { width: 'full', order: 0 },
    settings: { maxFiles: 5, acceptedTypes: ['image/*', 'application/pdf'] }
  },
  signature: {
    label: 'Digital Signature',
    layout: { width: 'full', order: 0 }
  },
  rating: {
    label: 'Rating',
    layout: { width: 'half', order: 0 },
    settings: { min: 1, max: 5 }
  },
  slider: {
    label: 'Slider',
    layout: { width: 'half', order: 0 },
    settings: { min: 0, max: 100, step: 1 }
  },
  color: {
    label: 'Color Picker',
    layout: { width: 'quarter', order: 0 }
  },
  section: {
    label: 'Section Header',
    layout: { width: 'full', order: 0 }
  },
  html: {
    label: 'HTML Content',
    layout: { width: 'full', order: 0 }
  }
}
