"use client"

import React, { useState, useCallback, useRef } from 'react'
import { 
  FormTemplate, 
  FormSection, 
  FormField, 
  FormFieldType,
  DEFAULT_FIELD_CONFIGS,
  generateFieldId,
  generateSectionId
} from '../../lib/forms'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Label } from '../ui/Label'
import { Badge } from '../ui/Badge'
import { 
  Plus,
  Trash2,
  Settings,
  Eye,
  Save,
  Copy,
  Move,
  GripVertical,
  Type,
  Hash,
  Mail,
  Phone,
  Globe,
  Calendar,
  Clock,
  ChevronDown,
  CheckSquare,
  Circle,
  Upload,
  PenTool,
  Star,
  Sliders,
  Palette,
  Layout,
  Code
} from 'lucide-react'

interface FormBuilderProps {
  initialTemplate?: FormTemplate
  onSave: (template: FormTemplate) => void
  onPreview: (template: FormTemplate) => void
  className?: string
}

const FIELD_TYPE_ICONS: Record<FormFieldType, React.ComponentType<{ className?: string }>> = {
  text: Type,
  textarea: Type,
  number: Hash,
  email: Mail,
  phone: Phone,
  url: Globe,
  date: Calendar,
  datetime: Calendar,
  time: Clock,
  select: ChevronDown,
  multiselect: ChevronDown,
  radio: Circle,
  checkbox: CheckSquare,
  file: Upload,
  signature: PenTool,
  rating: Star,
  slider: Sliders,
  color: Palette,
  section: Layout,
  html: Code,
}

const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  text: 'Text Input',
  textarea: 'Text Area',
  number: 'Number',
  email: 'Email',
  phone: 'Phone',
  url: 'Website URL',
  date: 'Date',
  datetime: 'Date & Time',
  time: 'Time',
  select: 'Dropdown',
  multiselect: 'Multi-Select',
  radio: 'Radio Buttons',
  checkbox: 'Checkboxes',
  file: 'File Upload',
  signature: 'Signature',
  rating: 'Rating',
  slider: 'Slider',
  color: 'Color Picker',
  section: 'Section Header',
  html: 'HTML Content',
}

export default function FormBuilder({
  initialTemplate,
  onSave,
  onPreview,
  className = '',
}: FormBuilderProps) {
  const [template, setTemplate] = useState<FormTemplate>(
    initialTemplate || {
      id: `form_${Date.now()}`,
      name: 'Untitled Form',
      description: '',
      category: 'general',
      version: 1,
      sections: [{
        id: generateSectionId(),
        title: 'General Information',
        fields: []
      }],
      settings: {
        allowDrafts: true,
        requireLogin: false,
        multiPage: false,
        showProgress: false,
        submitButtonText: 'Submit',
        successMessage: 'Thank you for your submission!',
        saveProgress: true,
        allowEditing: false,
      },
      styling: {
        theme: 'light',
        spacing: 'normal',
      },
      createdBy: 'current_user',
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      isPublic: false,
      tags: [],
    }
  )

  const [selectedField, setSelectedField] = useState<string | null>(null)
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [draggedField, setDraggedField] = useState<FormFieldType | null>(null)
  const [draggedExistingField, setDraggedExistingField] = useState<string | null>(null)

  const dragOverRef = useRef<HTMLDivElement>(null)

  // Add new section
  const addSection = useCallback(() => {
    const newSection: FormSection = {
      id: generateSectionId(),
      title: 'New Section',
      fields: []
    }
    
    setTemplate(prev => ({
      ...prev,
      sections: [...prev.sections, newSection],
      updatedAt: new Date()
    }))
  }, [])

  // Delete section
  const deleteSection = useCallback((sectionId: string) => {
    setTemplate(prev => ({
      ...prev,
      sections: prev.sections.filter(s => s.id !== sectionId),
      updatedAt: new Date()
    }))
    setSelectedSection(null)
  }, [])

  // Update section
  const updateSection = useCallback((sectionId: string, updates: Partial<FormSection>) => {
    setTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(s => 
        s.id === sectionId ? { ...s, ...updates } : s
      ),
      updatedAt: new Date()
    }))
  }, [])

  // Add field to section
  const addFieldToSection = useCallback((sectionId: string, fieldType: FormFieldType, index?: number) => {
    const defaultConfig = DEFAULT_FIELD_CONFIGS[fieldType]
    const newField: FormField = {
      id: generateFieldId(),
      type: fieldType,
      ...defaultConfig,
      label: defaultConfig.label || FIELD_TYPE_LABELS[fieldType],
    }

    setTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(s => {
        if (s.id === sectionId) {
          const fields = [...s.fields]
          if (index !== undefined) {
            fields.splice(index, 0, newField)
          } else {
            fields.push(newField)
          }
          return { ...s, fields }
        }
        return s
      }),
      updatedAt: new Date()
    }))

    setSelectedField(newField.id)
  }, [])

  // Update field
  const updateField = useCallback((fieldId: string, updates: Partial<FormField>) => {
    setTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(s => ({
        ...s,
        fields: s.fields.map(f => 
          f.id === fieldId ? { ...f, ...updates } : f
        )
      })),
      updatedAt: new Date()
    }))
  }, [])

  // Delete field
  const deleteField = useCallback((fieldId: string) => {
    setTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(s => ({
        ...s,
        fields: s.fields.filter(f => f.id !== fieldId)
      })),
      updatedAt: new Date()
    }))
    setSelectedField(null)
  }, [])

  // Move field
  const moveField = useCallback((fieldId: string, targetSectionId: string, targetIndex: number) => {
    setTemplate(prev => {
      // Find and remove the field
      let fieldToMove: FormField | null = null
      const sectionsWithoutField = prev.sections.map(s => ({
        ...s,
        fields: s.fields.filter(f => {
          if (f.id === fieldId) {
            fieldToMove = f
            return false
          }
          return true
        })
      }))

      if (!fieldToMove) return prev

      // Add field to target section
      const updatedSections = sectionsWithoutField.map(s => {
        if (s.id === targetSectionId) {
          const fields = [...s.fields]
          fields.splice(targetIndex, 0, fieldToMove!)
          return { ...s, fields }
        }
        return s
      })

      return {
        ...prev,
        sections: updatedSections,
        updatedAt: new Date()
      }
    })
  }, [])

  // Drag handlers
  const handleFieldTypeDragStart = (fieldType: FormFieldType) => {
    setDraggedField(fieldType)
  }

  const handleExistingFieldDragStart = (fieldId: string) => {
    setDraggedExistingField(fieldId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDropOnSection = (e: React.DragEvent, sectionId: string, index?: number) => {
    e.preventDefault()
    
    if (draggedField) {
      addFieldToSection(sectionId, draggedField, index)
      setDraggedField(null)
    } else if (draggedExistingField) {
      moveField(draggedExistingField, sectionId, index || 0)
      setDraggedExistingField(null)
    }
  }

  // Get selected field/section data
  const selectedFieldData = selectedField 
    ? template.sections.flatMap(s => s.fields).find(f => f.id === selectedField)
    : null

  const selectedSectionData = selectedSection
    ? template.sections.find(s => s.id === selectedSection)
    : null

  return (
    <div className={`h-full flex bg-[var(--background)] ${className}`}>
      {/* Field Palette */}
      <div className="w-64 flex-shrink-0 bg-[var(--surface)] border-r border-[var(--border-light)] p-4 overflow-y-auto">
        <h3 className="font-semibold text-[var(--text-primary)] mb-4">Field Types</h3>
        
        <div className="space-y-2">
          {Object.entries(FIELD_TYPE_LABELS).map(([type, label]) => {
            const Icon = FIELD_TYPE_ICONS[type as FormFieldType]
            return (
              <div
                key={type}
                draggable
                onDragStart={() => handleFieldTypeDragStart(type as FormFieldType)}
                className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border-light)] bg-white cursor-grab hover:bg-gray-50 hover:border-[var(--primary)] transition-colors"
              >
                <Icon className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">{label}</span>
              </div>
            )
          })}
        </div>

        <div className="mt-6 pt-6 border-t border-[var(--border-light)]">
          <h4 className="font-medium text-[var(--text-primary)] mb-3">Form Actions</h4>
          <div className="space-y-2">
            <Button variant="outline" size="sm" onClick={addSection} className="w-full justify-start">
              <Plus className="w-4 h-4 mr-2" />
              Add Section
            </Button>
            <Button variant="outline" size="sm" onClick={() => onPreview(template)} className="w-full justify-start">
              <Eye className="w-4 h-4 mr-2" />
              Preview Form
            </Button>
            <Button size="sm" onClick={() => onSave(template)} className="w-full justify-start">
              <Save className="w-4 h-4 mr-2" />
              Save Form
            </Button>
          </div>
        </div>
      </div>

      {/* Form Canvas */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {/* Form Header */}
          <div className="mb-8 p-6 bg-[var(--surface)] rounded-lg border border-[var(--border-light)]">
            <Input
              value={template.name}
              onChange={(e) => setTemplate(prev => ({ ...prev, name: e.target.value }))}
              className="text-2xl font-semibold mb-2 border-none bg-transparent p-0 focus:ring-0"
              placeholder="Form Title"
            />
            <textarea
              value={template.description || ''}
              onChange={(e) => setTemplate(prev => ({ ...prev, description: e.target.value }))}
              className="w-full text-[var(--text-secondary)] bg-transparent border-none resize-none focus:ring-0 p-0"
              placeholder="Form description..."
              rows={2}
            />
          </div>

          {/* Form Sections */}
          <div className="space-y-6">
            {template.sections.map((section, sectionIndex) => (
              <div
                key={section.id}
                className={`bg-[var(--surface)] rounded-lg border-2 transition-colors ${
                  selectedSection === section.id 
                    ? 'border-[var(--primary)]' 
                    : 'border-[var(--border-light)]'
                }`}
                onClick={() => setSelectedSection(section.id)}
              >
                {/* Section Header */}
                <div className="p-4 border-b border-[var(--border-light)] flex items-center justify-between">
                  <Input
                    value={section.title}
                    onChange={(e) => updateSection(section.id, { title: e.target.value })}
                    className="font-semibold text-lg border-none bg-transparent p-0 focus:ring-0"
                    placeholder="Section Title"
                  />
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{section.fields.length} fields</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteSection(section.id)
                      }}
                      className="p-1 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Section Fields */}
                <div
                  className="p-4 min-h-[100px]"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropOnSection(e, section.id)}
                >
                  {section.fields.length === 0 ? (
                    <div className="text-center py-8 text-[var(--text-secondary)]">
                      <Layout className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Drop fields here or click to add</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {section.fields.map((field, fieldIndex) => {
                        const Icon = FIELD_TYPE_ICONS[field.type]
                        return (
                          <div
                            key={field.id}
                            draggable
                            onDragStart={() => handleExistingFieldDragStart(field.id)}
                            className={`p-4 rounded-lg border-2 cursor-move transition-colors ${
                              selectedField === field.id
                                ? 'border-[var(--primary)] bg-blue-50'
                                : 'border-[var(--border-light)] bg-white hover:border-gray-300'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedField(field.id)
                            }}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <GripVertical className="w-4 h-4 text-gray-400" />
                                <Icon className="w-4 h-4 text-gray-500" />
                                <span className="font-medium">{field.label}</span>
                                {field.required && (
                                  <Badge variant="destructive" className="text-xs">Required</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <Badge variant="outline" className="text-xs">
                                  {FIELD_TYPE_LABELS[field.type]}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    deleteField(field.id)
                                  }}
                                  className="p-1 text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                            {field.description && (
                              <p className="text-sm text-[var(--text-secondary)]">{field.description}</p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add Section Button */}
          <Button
            variant="outline"
            onClick={addSection}
            className="w-full mt-6 py-8 border-dashed"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add New Section
          </Button>
        </div>
      </div>

      {/* Properties Panel */}
      <div className="w-80 flex-shrink-0 bg-[var(--surface)] border-l border-[var(--border-light)] p-4 overflow-y-auto">
        <h3 className="font-semibold text-[var(--text-primary)] mb-4">Properties</h3>

        {selectedFieldData ? (
          <FieldPropertiesPanel
            field={selectedFieldData}
            onUpdate={(updates) => updateField(selectedFieldData.id, updates)}
          />
        ) : selectedSectionData ? (
          <SectionPropertiesPanel
            section={selectedSectionData}
            onUpdate={(updates) => updateSection(selectedSectionData.id, updates)}
          />
        ) : (
          <FormPropertiesPanel
            template={template}
            onUpdate={(updates) => setTemplate(prev => ({ ...prev, ...updates }))}
          />
        )}
      </div>
    </div>
  )
}

// Field Properties Panel Component
function FieldPropertiesPanel({ 
  field, 
  onUpdate 
}: { 
  field: FormField
  onUpdate: (updates: Partial<FormField>) => void 
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="field-label">Label</Label>
        <Input
          id="field-label"
          value={field.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="field-description">Description</Label>
        <textarea
          id="field-description"
          value={field.description || ''}
          onChange={(e) => onUpdate({ description: e.target.value })}
          className="w-full p-2 border border-[var(--border-light)] rounded-md resize-none"
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="field-placeholder">Placeholder</Label>
        <Input
          id="field-placeholder"
          value={field.placeholder || ''}
          onChange={(e) => onUpdate({ placeholder: e.target.value })}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="field-required"
          checked={field.required || false}
          onChange={(e) => onUpdate({ required: e.target.checked })}
          className="rounded"
        />
        <Label htmlFor="field-required">Required field</Label>
      </div>

      <div>
        <Label>Layout Width</Label>
        <select
          value={field.layout?.width || 'full'}
          onChange={(e) => onUpdate({ 
            layout: { width: e.target.value as 'full' | 'half' | 'third' | 'quarter', order: field.layout?.order || 0 }
          })}
          className="w-full p-2 border border-[var(--border-light)] rounded-md"
        >
          <option value="full">Full Width</option>
          <option value="half">Half Width</option>
          <option value="third">One Third</option>
          <option value="quarter">One Quarter</option>
        </select>
      </div>
    </div>
  )
}

// Section Properties Panel Component
function SectionPropertiesPanel({ 
  section, 
  onUpdate 
}: { 
  section: FormSection
  onUpdate: (updates: Partial<FormSection>) => void 
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="section-title">Section Title</Label>
        <Input
          id="section-title"
          value={section.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="section-description">Description</Label>
        <textarea
          id="section-description"
          value={section.description || ''}
          onChange={(e) => onUpdate({ description: e.target.value })}
          className="w-full p-2 border border-[var(--border-light)] rounded-md resize-none"
          rows={3}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="section-collapsible"
          checked={section.collapsible || false}
          onChange={(e) => onUpdate({ collapsible: e.target.checked })}
          className="rounded"
        />
        <Label htmlFor="section-collapsible">Collapsible section</Label>
      </div>
    </div>
  )
}

// Form Properties Panel Component
function FormPropertiesPanel({ 
  template, 
  onUpdate 
}: { 
  template: FormTemplate
  onUpdate: (updates: Partial<FormTemplate>) => void 
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="form-category">Category</Label>
        <Input
          id="form-category"
          value={template.category}
          onChange={(e) => onUpdate({ category: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="submit-button-text">Submit Button Text</Label>
        <Input
          id="submit-button-text"
          value={template.settings.submitButtonText}
          onChange={(e) => onUpdate({ 
            settings: { ...template.settings, submitButtonText: e.target.value }
          })}
        />
      </div>

      <div>
        <Label htmlFor="success-message">Success Message</Label>
        <textarea
          id="success-message"
          value={template.settings.successMessage}
          onChange={(e) => onUpdate({ 
            settings: { ...template.settings, successMessage: e.target.value }
          })}
          className="w-full p-2 border border-[var(--border-light)] rounded-md resize-none"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="allow-drafts"
            checked={template.settings.allowDrafts}
            onChange={(e) => onUpdate({ 
              settings: { ...template.settings, allowDrafts: e.target.checked }
            })}
            className="rounded"
          />
          <Label htmlFor="allow-drafts">Allow draft saves</Label>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="require-login"
            checked={template.settings.requireLogin}
            onChange={(e) => onUpdate({ 
              settings: { ...template.settings, requireLogin: e.target.checked }
            })}
            className="rounded"
          />
          <Label htmlFor="require-login">Require login</Label>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="show-progress"
            checked={template.settings.showProgress}
            onChange={(e) => onUpdate({ 
              settings: { ...template.settings, showProgress: e.target.checked }
            })}
            className="rounded"
          />
          <Label htmlFor="show-progress">Show progress bar</Label>
        </div>
      </div>
    </div>
  )
}
