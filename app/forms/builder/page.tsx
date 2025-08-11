"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '../../../components/layout/DashboardLayout'
import FormBuilder from '../../../components/features/FormBuilder'
import { FormTemplate } from '../../../lib/forms'
import { useToast } from '../../../components/ui/ToastProvider'

export default function FormBuilderPage() {
  const router = useRouter()
  const { show } = useToast()
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [previewTemplate, setPreviewTemplate] = useState<FormTemplate | null>(null)

  const handleSave = async (template: FormTemplate) => {
    try {
      // TODO: Implement API call to save form template
      console.log('Saving form template:', template)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      show('Form saved successfully!', 'success')
      
      // Redirect to forms list after save
      setTimeout(() => {
        router.push('/forms')
      }, 1500)
      } catch {
    show('Failed to save form', 'error')
  }
  }

  const handlePreview = (template: FormTemplate) => {
    setPreviewTemplate(template)
    setIsPreviewOpen(true)
  }

  return (
    <>
      <DashboardLayout>
        <div className="h-full">
          <FormBuilder
            onSave={handleSave}
            onPreview={handlePreview}
            className="h-full"
          />
        </div>
      </DashboardLayout>

      {/* Preview Modal */}
      {isPreviewOpen && previewTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Form Preview</h2>
                <p className="text-sm text-gray-500 mt-1">{previewTemplate.name}</p>
              </div>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <FormPreview template={previewTemplate} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Form Preview Component
function FormPreview({ template }: { template: FormTemplate }) {
  const [formData, setFormData] = useState<Record<string, unknown>>({})

  const handleFieldChange = (fieldId: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }))
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Form Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{template.name}</h1>
        {template.description && (
          <p className="text-gray-600">{template.description}</p>
        )}
      </div>

      {/* Form Sections */}
      <div className="space-y-8">
        {template.sections.map((section) => (
          <div key={section.id} className="space-y-6">
            {/* Section Header */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{section.title}</h2>
              {section.description && (
                <p className="text-sm text-gray-600 mt-1">{section.description}</p>
              )}
            </div>

            {/* Section Fields */}
            <div className="space-y-4">
              {section.fields.map((field) => (
                <div key={field.id} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  
                  {field.description && (
                    <p className="text-xs text-gray-500">{field.description}</p>
                  )}

                  <FormFieldPreview
                    field={field}
                    value={formData[field.id]}
                    onChange={(value) => handleFieldChange(field.id, value)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Submit Button */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <button
          type="button"
          className="w-full bg-[var(--primary)] text-white py-3 px-4 rounded-lg font-medium hover:bg-[var(--primary)]/90 transition-colors"
          onClick={() => console.log('Form submitted:', formData)}
        >
          {template.settings.submitButtonText}
        </button>
      </div>
    </div>
  )
}

// Individual Field Preview Component
function FormFieldPreview({ 
  field, 
  value, 
  onChange 
}: { 
  field: {
    id: string
    type: string
    placeholder?: string
    settings?: {
      rows?: number
      min?: number
      max?: number
      step?: number
      allowMultiple?: boolean
      acceptedTypes?: string[]
    }
    options?: Array<{ id: string; label: string; value: string }>
    defaultValue?: unknown
    label: string
  }
  value: unknown
  onChange: (value: unknown) => void 
}) {
  const baseInputClasses = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"

  switch (field.type) {
    case 'text':
    case 'email':
    case 'phone':
    case 'url':
      return (
        <input
          type={field.type}
          placeholder={field.placeholder}
          value={value as string || ''}
          onChange={(e) => onChange(e.target.value)}
          className={baseInputClasses}
        />
      )

    case 'textarea':
      return (
        <textarea
          placeholder={field.placeholder}
          value={value as string || ''}
          onChange={(e) => onChange(e.target.value)}
          rows={field.settings?.rows || 4}
          className={baseInputClasses}
        />
      )

    case 'number':
      return (
        <input
          type="number"
          placeholder={field.placeholder}
          value={value as number || ''}
          onChange={(e) => onChange(Number(e.target.value))}
          min={field.settings?.min}
          max={field.settings?.max}
          step={field.settings?.step}
          className={baseInputClasses}
        />
      )

    case 'date':
      return (
        <input
          type="date"
          value={value as string || ''}
          onChange={(e) => onChange(e.target.value)}
          className={baseInputClasses}
        />
      )

    case 'select':
      return (
        <select
          value={value as string || ''}
          onChange={(e) => onChange(e.target.value)}
          className={baseInputClasses}
        >
          <option value="">Select an option...</option>
          {field.options?.map((option) => (
            <option key={option.id} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )

    case 'radio':
      return (
        <div className="space-y-2">
          {field.options?.map((option) => (
            <label key={option.id} className="flex items-center">
              <input
                type="radio"
                name={field.id}
                value={option.value}
                checked={value === option.value}
                onChange={(e) => onChange(e.target.value)}
                className="mr-2"
              />
              {option.label}
            </label>
          ))}
        </div>
      )

    case 'checkbox':
      return (
        <div className="space-y-2">
          {field.options?.map((option) => (
            <label key={option.id} className="flex items-center">
              <input
                type="checkbox"
                value={option.value}
                checked={Array.isArray(value) && value.includes(option.value)}
                onChange={(e) => {
                  const currentValues = Array.isArray(value) ? value : []
                  if (e.target.checked) {
                    onChange([...currentValues, option.value])
                  } else {
                    onChange(currentValues.filter(v => v !== option.value))
                  }
                }}
                className="mr-2"
              />
              {option.label}
            </label>
          ))}
        </div>
      )

    case 'file':
      return (
        <input
          type="file"
          multiple={field.settings?.allowMultiple}
          accept={field.settings?.acceptedTypes?.join(',')}
          onChange={(e) => onChange(e.target.files)}
          className={baseInputClasses}
        />
      )

    case 'rating':
      return (
        <div className="flex gap-1">
          {Array.from({ length: field.settings?.max || 5 }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onChange(i + 1)}
              className={`w-8 h-8 rounded ${
                (value as number) > i ? 'bg-yellow-400' : 'bg-gray-200'
              } hover:bg-yellow-300 transition-colors`}
            >
              ⭐
            </button>
          ))}
        </div>
      )

    case 'slider':
      return (
        <div className="space-y-2">
          <input
            type="range"
            min={field.settings?.min || 0}
            max={field.settings?.max || 100}
            step={field.settings?.step || 1}
            value={value as number || field.settings?.min || 0}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full"
          />
          <div className="text-sm text-gray-500 text-center">
            Value: {String(value || field.settings?.min || 0)}
          </div>
        </div>
      )

    case 'section':
      return (
        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-lg font-semibold text-gray-900">{field.label}</h3>
        </div>
      )

    case 'html':
      return (
        <div 
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: field.defaultValue as string || field.label }}
        />
      )

    default:
      return (
        <div className="p-4 bg-gray-100 rounded border-2 border-dashed border-gray-300 text-center text-gray-500">
          {field.type} field (preview not available)
        </div>
      )
  }
}
