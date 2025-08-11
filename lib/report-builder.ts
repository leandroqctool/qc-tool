// Enterprise Report Builder System
import { neon } from '@neondatabase/serverless'

export interface ReportTemplate {
  id: string
  name: string
  description: string
  category: 'qc' | 'analytics' | 'financial' | 'operational' | 'custom'
  tenantId: string
  createdBy: string
  isPublic: boolean
  config: ReportConfig
  schedule?: ReportSchedule
  createdAt: Date
  updatedAt: Date
  lastGeneratedAt?: Date
}

export interface ReportConfig {
  dataSources: DataSource[]
  filters: ReportFilter[]
  groupBy: GroupByConfig[]
  aggregations: AggregationConfig[]
  sorting: SortConfig[]
  formatting: FormatConfig
  visualization: VisualizationConfig
  layout: LayoutConfig
}

export interface DataSource {
  id: string
  type: 'table' | 'view' | 'query' | 'api'
  name: string
  source: string // table name, query, or API endpoint
  joins?: JoinConfig[]
  fields: FieldConfig[]
}

export interface FieldConfig {
  name: string
  alias?: string
  type: 'string' | 'number' | 'date' | 'boolean' | 'json'
  format?: string
  required: boolean
  filterable: boolean
  sortable: boolean
  aggregatable: boolean
}

export interface JoinConfig {
  type: 'inner' | 'left' | 'right' | 'full'
  table: string
  on: string
  alias?: string
}

export interface ReportFilter {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in' | 'is_null' | 'is_not_null'
  value: unknown
  logicalOperator?: 'and' | 'or'
  required: boolean
  userEditable: boolean
  defaultValue?: unknown
}

export interface GroupByConfig {
  field: string
  alias?: string
  dateFormat?: 'day' | 'week' | 'month' | 'quarter' | 'year'
  order: number
}

export interface AggregationConfig {
  field: string
  function: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'distinct_count'
  alias: string
  format?: string
}

export interface SortConfig {
  field: string
  direction: 'asc' | 'desc'
  order: number
}

export interface FormatConfig {
  numberFormat: {
    decimals: number
    thousandsSeparator: string
    decimalSeparator: string
    prefix?: string
    suffix?: string
  }
  dateFormat: string
  currencyFormat: {
    currency: string
    position: 'before' | 'after'
  }
  percentFormat: {
    decimals: number
    showSymbol: boolean
  }
}

export interface VisualizationConfig {
  type: 'table' | 'chart' | 'both'
  charts: ChartConfig[]
  table: TableConfig
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'doughnut' | 'area' | 'scatter' | 'gauge' | 'heatmap'
  title: string
  xAxis: string
  yAxis: string[]
  colors: string[]
  options: Record<string, unknown>
}

export interface TableConfig {
  showHeader: boolean
  showFooter: boolean
  alternateRows: boolean
  pagination: {
    enabled: boolean
    pageSize: number
  }
  columnWidths: Record<string, number>
  conditionalFormatting: ConditionalFormat[]
}

export interface ConditionalFormat {
  field: string
  condition: {
    operator: 'greater_than' | 'less_than' | 'equals' | 'between'
    value: unknown
  }
  style: {
    backgroundColor?: string
    textColor?: string
    fontWeight?: 'normal' | 'bold'
    icon?: string
  }
}

export interface LayoutConfig {
  orientation: 'portrait' | 'landscape'
  pageSize: 'A4' | 'A3' | 'letter' | 'legal'
  margins: {
    top: number
    bottom: number
    left: number
    right: number
  }
  header: {
    enabled: boolean
    content: string
    height: number
  }
  footer: {
    enabled: boolean
    content: string
    height: number
  }
  sections: ReportSection[]
}

export interface ReportSection {
  id: string
  type: 'title' | 'text' | 'chart' | 'table' | 'image' | 'spacer'
  content: unknown
  position: {
    x: number
    y: number
    width: number
    height: number
  }
  style: Record<string, unknown>
}

export interface ReportSchedule {
  enabled: boolean
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  time: string // HH:MM
  timezone: string
  recipients: string[] // email addresses
  format: 'pdf' | 'excel' | 'csv'
  nextRun?: Date
  lastRun?: Date
}

export interface GeneratedReport {
  id: string
  templateId: string
  tenantId: string
  generatedBy: string
  format: 'pdf' | 'excel' | 'csv' | 'json'
  status: 'pending' | 'generating' | 'completed' | 'failed'
  parameters: Record<string, unknown>
  data: ReportData
  fileUrl?: string
  fileSize?: number
  generatedAt: Date
  expiresAt?: Date
  error?: string
}

export interface ReportData {
  metadata: {
    totalRows: number
    generatedAt: Date
    parameters: Record<string, unknown>
    executionTime: number
  }
  columns: ColumnDefinition[]
  rows: Record<string, unknown>[]
  aggregations: Record<string, unknown>
  charts: ChartData[]
}

export interface ColumnDefinition {
  name: string
  alias: string
  type: string
  format?: string
  width?: number
}

export interface ChartData {
  type: string
  title: string
  labels: string[]
  datasets: {
    label: string
    data: number[]
    backgroundColor?: string[]
    borderColor?: string[]
  }[]
}

// Report Builder Engine
export class ReportBuilder {
  private sql: ReturnType<typeof neon>

  constructor() {
    this.sql = neon(process.env.DATABASE_URL!)
  }

  // Generate report
  async generateReport(templateId: string, parameters: Record<string, unknown> = {}, format: 'pdf' | 'excel' | 'csv' | 'json' = 'json', userId?: string): Promise<string> {
    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const startTime = Date.now()

    try {
      // Get template
      const template = await this.getTemplate(templateId)
      if (!template) {
        throw new Error('Report template not found')
      }

      // Create report record
      const report: GeneratedReport = {
        id: reportId,
        templateId,
        tenantId: template.tenantId,
        generatedBy: userId || 'system',
        format,
        status: 'generating',
        parameters,
        data: {
          metadata: {
            totalRows: 0,
            generatedAt: new Date(),
            parameters,
            executionTime: 0
          },
          columns: [],
          rows: [],
          aggregations: {},
          charts: []
        },
        generatedAt: new Date()
      }

      await this.storeReport(report)

      // Execute queries and build data
      const data = await this.buildReportData(template, parameters)
      report.data = data
      report.data.metadata.executionTime = Date.now() - startTime

      // Generate file based on format
      const fileUrl = await this.generateFile(report, template)
      report.fileUrl = fileUrl
      report.status = 'completed'

      await this.updateReport(report)

      console.log(`Report generated: ${reportId}, Format: ${format}, Rows: ${data.metadata.totalRows}`)
      return reportId

    } catch (error) {
      console.error(`Report generation failed: ${reportId}`, error)
      
      await this.updateReport({
        id: reportId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      } as GeneratedReport)
      
      throw error
    }
  }

  // Build report data
  private async buildReportData(template: ReportTemplate, parameters: Record<string, unknown>): Promise<ReportData> {
    const { config } = template
    const startTime = Date.now()

    // Build SQL query
    const query = this.buildQuery(config, parameters)
    console.log('Generated SQL:', query)

    // Execute query
    const rows = await this.sql(query) as Record<string, unknown>[]

    // Process data
    const columns = this.buildColumns(config)
    const processedRows = this.processRows(rows, config)
    const aggregations = this.calculateAggregations(processedRows, config)
    const charts = this.buildChartData(processedRows, config)

    return {
      metadata: {
        totalRows: processedRows.length,
        generatedAt: new Date(),
        parameters,
        executionTime: Date.now() - startTime
      },
      columns,
      rows: processedRows,
      aggregations,
      charts
    }
  }

  // Build SQL query
  private buildQuery(config: ReportConfig, parameters: Record<string, unknown>): string {
    const { dataSources, filters, groupBy, aggregations, sorting } = config

    if (dataSources.length === 0) {
      throw new Error('No data sources configured')
    }

    const primarySource = dataSources[0]
    let query = `SELECT `

    // Build SELECT clause
    const selectFields: string[] = []

    // Add regular fields
    primarySource.fields.forEach(field => {
      if (!field.aggregatable) {
        const fieldName = field.alias ? `${field.name} AS "${field.alias}"` : `"${field.name}"`
        selectFields.push(fieldName)
      }
    })

    // Add group by fields
    groupBy.forEach(group => {
      const fieldName = group.alias ? `${group.field} AS "${group.alias}"` : `"${group.field}"`
      if (!selectFields.includes(fieldName)) {
        selectFields.push(fieldName)
      }
    })

    // Add aggregations
    aggregations.forEach(agg => {
      const aggField = `${agg.function.toUpperCase()}(${agg.field}) AS "${agg.alias}"`
      selectFields.push(aggField)
    })

    query += selectFields.join(', ')

    // FROM clause
    query += ` FROM ${primarySource.source}`

    // JOIN clauses
    primarySource.joins?.forEach(join => {
      query += ` ${join.type.toUpperCase()} JOIN ${join.table}`
      if (join.alias) query += ` AS ${join.alias}`
      query += ` ON ${join.on}`
    })

    // WHERE clause
    const whereConditions = this.buildWhereClause(filters, parameters)
    if (whereConditions) {
      query += ` WHERE ${whereConditions}`
    }

    // GROUP BY clause
    if (groupBy.length > 0) {
      const groupFields = groupBy
        .sort((a, b) => a.order - b.order)
        .map(group => group.field)
      query += ` GROUP BY ${groupFields.join(', ')}`
    }

    // ORDER BY clause
    if (sorting.length > 0) {
      const orderFields = sorting
        .sort((a, b) => a.order - b.order)
        .map(sort => `${sort.field} ${sort.direction.toUpperCase()}`)
      query += ` ORDER BY ${orderFields.join(', ')}`
    }

    return query
  }

  // Build WHERE clause
  private buildWhereClause(filters: ReportFilter[], parameters: Record<string, unknown>): string {
    const conditions: string[] = []

    filters.forEach(filter => {
      const value = parameters[filter.field] !== undefined ? parameters[filter.field] : filter.defaultValue

      if (value === undefined || value === null) {
        if (filter.required) {
          throw new Error(`Required filter ${filter.field} is missing`)
        }
        return
      }

      let condition = ''

      switch (filter.operator) {
        case 'equals':
          condition = `${filter.field} = '${value}'`
          break
        case 'not_equals':
          condition = `${filter.field} != '${value}'`
          break
        case 'contains':
          condition = `${filter.field} ILIKE '%${value}%'`
          break
        case 'starts_with':
          condition = `${filter.field} ILIKE '${value}%'`
          break
        case 'ends_with':
          condition = `${filter.field} ILIKE '%${value}'`
          break
        case 'greater_than':
          condition = `${filter.field} > ${value}`
          break
        case 'less_than':
          condition = `${filter.field} < ${value}`
          break
        case 'between':
          if (Array.isArray(value) && value.length === 2) {
            condition = `${filter.field} BETWEEN ${value[0]} AND ${value[1]}`
          }
          break
        case 'in':
          if (Array.isArray(value)) {
            const values = value.map(v => `'${v}'`).join(', ')
            condition = `${filter.field} IN (${values})`
          }
          break
        case 'not_in':
          if (Array.isArray(value)) {
            const values = value.map(v => `'${v}'`).join(', ')
            condition = `${filter.field} NOT IN (${values})`
          }
          break
        case 'is_null':
          condition = `${filter.field} IS NULL`
          break
        case 'is_not_null':
          condition = `${filter.field} IS NOT NULL`
          break
      }

      if (condition) {
        conditions.push(condition)
      }
    })

    return conditions.join(' AND ')
  }

  // Build columns
  private buildColumns(config: ReportConfig): ColumnDefinition[] {
    const columns: ColumnDefinition[] = []

    // Add regular fields
    config.dataSources[0].fields.forEach(field => {
      if (!field.aggregatable) {
        columns.push({
          name: field.name,
          alias: field.alias || field.name,
          type: field.type,
          format: field.format
        })
      }
    })

    // Add group by fields
    config.groupBy.forEach(group => {
      const existing = columns.find(col => col.name === group.field)
      if (!existing) {
        columns.push({
          name: group.field,
          alias: group.alias || group.field,
          type: 'string'
        })
      }
    })

    // Add aggregations
    config.aggregations.forEach(agg => {
      columns.push({
        name: agg.alias,
        alias: agg.alias,
        type: 'number',
        format: agg.format
      })
    })

    return columns
  }

  // Process rows
  private processRows(rows: Record<string, unknown>[], config: ReportConfig): Record<string, unknown>[] {
    return rows.map(row => {
      const processedRow: Record<string, unknown> = {}

      Object.entries(row).forEach(([key, value]) => {
        // Apply formatting
        const column = config.dataSources[0].fields.find(f => f.name === key || f.alias === key)
        if (column && column.format) {
          processedRow[key] = this.formatValue(value, column.type, column.format, config.formatting)
        } else {
          processedRow[key] = value
        }
      })

      return processedRow
    })
  }

  // Calculate aggregations
  private calculateAggregations(rows: Record<string, unknown>[], config: ReportConfig): Record<string, unknown> {
    const aggregations: Record<string, unknown> = {}

    config.aggregations.forEach(agg => {
      const values = rows.map(row => Number(row[agg.alias])).filter(v => !isNaN(v))

      switch (agg.function) {
        case 'count':
          aggregations[agg.alias] = rows.length
          break
        case 'sum':
          aggregations[agg.alias] = values.reduce((sum, val) => sum + val, 0)
          break
        case 'avg':
          aggregations[agg.alias] = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0
          break
        case 'min':
          aggregations[agg.alias] = values.length > 0 ? Math.min(...values) : 0
          break
        case 'max':
          aggregations[agg.alias] = values.length > 0 ? Math.max(...values) : 0
          break
        case 'distinct_count':
          aggregations[agg.alias] = new Set(values).size
          break
      }
    })

    return aggregations
  }

  // Build chart data
  private buildChartData(rows: Record<string, unknown>[], config: ReportConfig): ChartData[] {
    if (config.visualization.type === 'table') return []

    return config.visualization.charts.map(chartConfig => {
      const labels = [...new Set(rows.map(row => String(row[chartConfig.xAxis])))]
      
      const datasets = chartConfig.yAxis.map((yField, index) => {
        const data = labels.map(label => {
          const matchingRows = rows.filter(row => String(row[chartConfig.xAxis]) === label)
          const values = matchingRows.map(row => Number(row[yField])).filter(v => !isNaN(v))
          return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) : 0
        })

        return {
          label: yField,
          data,
          backgroundColor: chartConfig.colors[index] || `hsl(${index * 60}, 70%, 50%)`,
          borderColor: chartConfig.colors[index] || `hsl(${index * 60}, 70%, 40%)`
        }
      })

      return {
        type: chartConfig.type,
        title: chartConfig.title,
        labels,
        datasets
      }
    })
  }

  // Format value
  private formatValue(value: unknown, type: string, format: string, formatting: FormatConfig): string {
    if (value === null || value === undefined) return ''

    switch (type) {
      case 'number':
        const num = Number(value)
        if (isNaN(num)) return String(value)
        
        const { decimals, thousandsSeparator, decimalSeparator, prefix, suffix } = formatting.numberFormat
        let formatted = num.toFixed(decimals)
        
        // Add thousands separator
        formatted = formatted.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator)
        
        // Replace decimal separator
        if (decimalSeparator !== '.') {
          formatted = formatted.replace('.', decimalSeparator)
        }
        
        return `${prefix || ''}${formatted}${suffix || ''}`

      case 'date':
        const date = new Date(String(value))
        if (isNaN(date.getTime())) return String(value)
        
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        })

      default:
        return String(value)
    }
  }

  // Generate file
  private async generateFile(report: GeneratedReport, template: ReportTemplate): Promise<string> {
    const { format } = report

    switch (format) {
      case 'pdf':
        return await this.generatePDF(report, template)
      case 'excel':
        return await this.generateExcel(report, template)
      case 'csv':
        return await this.generateCSV(report, template)
      case 'json':
        return await this.generateJSON(report, template)
      default:
        throw new Error(`Unsupported format: ${format}`)
    }
  }

  // Generate PDF
  private async generatePDF(report: GeneratedReport, template: ReportTemplate): Promise<string> {
    console.log(`Generating PDF report: ${report.id}`)
    
    // Mock PDF generation - would use libraries like puppeteer or jsPDF
    const fileName = `report_${report.id}.pdf`
    const fileUrl = `/reports/${fileName}`
    
    // Store file size
    report.fileSize = 1024 * 100 // Mock 100KB
    
    return fileUrl
  }

  // Generate Excel
  private async generateExcel(report: GeneratedReport, template: ReportTemplate): Promise<string> {
    console.log(`Generating Excel report: ${report.id}`)
    
    // Mock Excel generation - would use libraries like exceljs
    const fileName = `report_${report.id}.xlsx`
    const fileUrl = `/reports/${fileName}`
    
    report.fileSize = 1024 * 50 // Mock 50KB
    
    return fileUrl
  }

  // Generate CSV
  private async generateCSV(report: GeneratedReport, template: ReportTemplate): Promise<string> {
    console.log(`Generating CSV report: ${report.id}`)
    
    const { data } = report
    
    // Generate CSV content
    const headers = data.columns.map(col => col.alias).join(',')
    const rows = data.rows.map(row => 
      data.columns.map(col => {
        const value = row[col.name]
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : String(value)
      }).join(',')
    )
    
    const csvContent = [headers, ...rows].join('\n')
    
    // Mock file storage
    const fileName = `report_${report.id}.csv`
    const fileUrl = `/reports/${fileName}`
    
    report.fileSize = Buffer.byteLength(csvContent)
    
    return fileUrl
  }

  // Generate JSON
  private async generateJSON(report: GeneratedReport, template: ReportTemplate): Promise<string> {
    console.log(`Generating JSON report: ${report.id}`)
    
    const jsonContent = JSON.stringify(report.data, null, 2)
    
    // Mock file storage
    const fileName = `report_${report.id}.json`
    const fileUrl = `/reports/${fileName}`
    
    report.fileSize = Buffer.byteLength(jsonContent)
    
    return fileUrl
  }

  // Schedule report
  async scheduleReport(templateId: string, schedule: ReportSchedule): Promise<void> {
    console.log(`Scheduling report: ${templateId}`)
    
    // Calculate next run time
    const nextRun = this.calculateNextRun(schedule)
    schedule.nextRun = nextRun
    
    // Store schedule
    await this.storeSchedule(templateId, schedule)
  }

  // Calculate next run time
  private calculateNextRun(schedule: ReportSchedule): Date {
    const now = new Date()
    const [hours, minutes] = schedule.time.split(':').map(Number)
    
    const nextRun = new Date(now)
    nextRun.setHours(hours, minutes, 0, 0)
    
    // If time has passed today, move to next occurrence
    if (nextRun <= now) {
      switch (schedule.frequency) {
        case 'daily':
          nextRun.setDate(nextRun.getDate() + 1)
          break
        case 'weekly':
          nextRun.setDate(nextRun.getDate() + 7)
          break
        case 'monthly':
          nextRun.setMonth(nextRun.getMonth() + 1)
          break
        case 'quarterly':
          nextRun.setMonth(nextRun.getMonth() + 3)
          break
        case 'yearly':
          nextRun.setFullYear(nextRun.getFullYear() + 1)
          break
      }
    }
    
    return nextRun
  }

  // Database operations (placeholders)
  private async getTemplate(templateId: string): Promise<ReportTemplate | null> {
    console.log(`Getting template: ${templateId}`)
    
    // Mock template
    return {
      id: templateId,
      name: 'QC Performance Report',
      description: 'Quality control performance metrics',
      category: 'qc',
      tenantId: 'tenant_123',
      createdBy: 'user_123',
      isPublic: false,
      config: {
        dataSources: [{
          id: 'files',
          type: 'table',
          name: 'Files',
          source: 'files',
          fields: [
            { name: 'status', type: 'string', required: false, filterable: true, sortable: true, aggregatable: false },
            { name: 'created_at', alias: 'Date', type: 'date', required: false, filterable: true, sortable: true, aggregatable: false }
          ]
        }],
        filters: [],
        groupBy: [{ field: 'status', order: 1 }],
        aggregations: [{ field: 'id', function: 'count', alias: 'File Count' }],
        sorting: [{ field: 'status', direction: 'asc', order: 1 }],
        formatting: {
          numberFormat: {
            decimals: 0,
            thousandsSeparator: ',',
            decimalSeparator: '.'
          },
          dateFormat: 'MM/dd/yyyy',
          currencyFormat: {
            currency: 'USD',
            position: 'before'
          },
          percentFormat: {
            decimals: 1,
            showSymbol: true
          }
        },
        visualization: {
          type: 'both',
          charts: [{
            type: 'bar',
            title: 'Files by Status',
            xAxis: 'status',
            yAxis: ['File Count'],
            colors: ['#0D99FF'],
            options: {}
          }],
          table: {
            showHeader: true,
            showFooter: true,
            alternateRows: true,
            pagination: { enabled: true, pageSize: 50 },
            columnWidths: {},
            conditionalFormatting: []
          }
        },
        layout: {
          orientation: 'portrait',
          pageSize: 'A4',
          margins: { top: 20, bottom: 20, left: 20, right: 20 },
          header: { enabled: true, content: 'QC Performance Report', height: 50 },
          footer: { enabled: true, content: 'Generated on {{date}}', height: 30 },
          sections: []
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  private async storeReport(report: GeneratedReport): Promise<void> {
    console.log(`Storing report: ${report.id}`)
  }

  private async updateReport(report: GeneratedReport): Promise<void> {
    console.log(`Updating report: ${report.id}`)
  }

  private async storeSchedule(templateId: string, schedule: ReportSchedule): Promise<void> {
    console.log(`Storing schedule for template: ${templateId}`)
  }
}

// Predefined report templates
export const PREDEFINED_TEMPLATES = {
  QC_PERFORMANCE: {
    name: 'QC Performance Report',
    description: 'Quality control metrics and performance indicators',
    category: 'qc' as const,
    config: {
      // Configuration for QC performance report
    }
  },
  
  PROJECT_STATUS: {
    name: 'Project Status Report',
    description: 'Current status of all active projects',
    category: 'operational' as const,
    config: {
      // Configuration for project status report
    }
  },
  
  TEAM_PRODUCTIVITY: {
    name: 'Team Productivity Report',
    description: 'Team member productivity and workload analysis',
    category: 'analytics' as const,
    config: {
      // Configuration for team productivity report
    }
  },
  
  FINANCIAL_SUMMARY: {
    name: 'Financial Summary Report',
    description: 'Revenue, costs, and profitability analysis',
    category: 'financial' as const,
    config: {
      // Configuration for financial summary report
    }
  }
}

// Export report builder instance
export const reportBuilder = new ReportBuilder()
