/**
 * Load Testing Utilities
 * 
 * This file contains utilities for performance and load testing
 * the QC Tool application under various conditions.
 */

interface LoadTestConfig {
  baseURL: string
  concurrentUsers: number
  testDuration: number // in seconds
  endpoints: LoadTestEndpoint[]
}

interface LoadTestEndpoint {
  path: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers?: Record<string, string>
  body?: unknown
  expectedStatus?: number
  weight: number // Probability weight for this endpoint
}

interface LoadTestResult {
  endpoint: string
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  minResponseTime: number
  maxResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number
  requestsPerSecond: number
  errors: LoadTestError[]
}

interface LoadTestError {
  endpoint: string
  error: string
  timestamp: Date
  responseTime: number
}

class LoadTester {
  private config: LoadTestConfig
  private results: Map<string, LoadTestResult> = new Map()
  private errors: LoadTestError[] = []
  private startTime: number = 0
  private endTime: number = 0

  constructor(config: LoadTestConfig) {
    this.config = config
  }

  async runLoadTest(): Promise<Map<string, LoadTestResult>> {
    console.log(`Starting load test with ${this.config.concurrentUsers} concurrent users for ${this.config.testDuration}s`)
    
    this.startTime = Date.now()
    const endTime = this.startTime + (this.config.testDuration * 1000)

    // Initialize results for each endpoint
    this.config.endpoints.forEach(endpoint => {
      this.results.set(endpoint.path, {
        endpoint: endpoint.path,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        minResponseTime: Infinity,
        maxResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        requestsPerSecond: 0,
        errors: []
      })
    })

    // Create concurrent user sessions
    const userPromises = Array.from({ length: this.config.concurrentUsers }, (_, index) =>
      this.simulateUser(index, endTime)
    )

    // Wait for all users to complete
    await Promise.all(userPromises)

    this.endTime = Date.now()
    this.calculateFinalMetrics()

    return this.results
  }

  private async simulateUser(userId: number, endTime: number): Promise<void> {
    const responseTimes: Map<string, number[]> = new Map()
    
    while (Date.now() < endTime) {
      const endpoint = this.selectRandomEndpoint()
      const startTime = Date.now()

      try {
        const response = await this.makeRequest(endpoint)
        const responseTime = Date.now() - startTime

        // Record response time
        if (!responseTimes.has(endpoint.path)) {
          responseTimes.set(endpoint.path, [])
        }
        responseTimes.get(endpoint.path)!.push(responseTime)

        // Update results
        const result = this.results.get(endpoint.path)!
        result.totalRequests++
        
        if (response.ok && (!endpoint.expectedStatus || response.status === endpoint.expectedStatus)) {
          result.successfulRequests++
        } else {
          result.failedRequests++
          this.errors.push({
            endpoint: endpoint.path,
            error: `HTTP ${response.status}: ${response.statusText}`,
            timestamp: new Date(),
            responseTime
          })
        }

        // Update response time metrics
        result.minResponseTime = Math.min(result.minResponseTime, responseTime)
        result.maxResponseTime = Math.max(result.maxResponseTime, responseTime)

      } catch (error) {
        const responseTime = Date.now() - startTime
        const result = this.results.get(endpoint.path)!
        
        result.totalRequests++
        result.failedRequests++
        
        this.errors.push({
          endpoint: endpoint.path,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date(),
          responseTime
        })
      }

      // Small delay to prevent overwhelming the server
      await this.sleep(Math.random() * 100)
    }

    // Calculate percentiles for this user's requests
    responseTimes.forEach((times, endpoint) => {
      const result = this.results.get(endpoint)!
      const sortedTimes = times.sort((a, b) => a - b)
      
      if (sortedTimes.length > 0) {
        result.p95ResponseTime = this.calculatePercentile(sortedTimes, 95)
        result.p99ResponseTime = this.calculatePercentile(sortedTimes, 99)
      }
    })
  }

  private selectRandomEndpoint(): LoadTestEndpoint {
    const totalWeight = this.config.endpoints.reduce((sum, endpoint) => sum + endpoint.weight, 0)
    let random = Math.random() * totalWeight
    
    for (const endpoint of this.config.endpoints) {
      random -= endpoint.weight
      if (random <= 0) {
        return endpoint
      }
    }
    
    return this.config.endpoints[0] // Fallback
  }

  private async makeRequest(endpoint: LoadTestEndpoint): Promise<Response> {
    const url = `${this.config.baseURL}${endpoint.path}`
    
    const requestOptions: RequestInit = {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
        ...endpoint.headers
      }
    }

    if (endpoint.body && endpoint.method !== 'GET') {
      requestOptions.body = JSON.stringify(endpoint.body)
    }

    return fetch(url, requestOptions)
  }

  private calculatePercentile(sortedArray: number[], percentile: number): number {
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1
    return sortedArray[Math.max(0, index)]
  }

  private calculateFinalMetrics(): void {
    const totalDuration = (this.endTime - this.startTime) / 1000

    this.results.forEach((result, endpoint) => {
      if (result.totalRequests > 0) {
        result.requestsPerSecond = result.totalRequests / totalDuration
        
        // Calculate average response time from all recorded times
        const allTimes = this.errors
          .filter(error => error.endpoint === endpoint)
          .map(error => error.responseTime)
        
        if (allTimes.length > 0) {
          result.averageResponseTime = allTimes.reduce((sum, time) => sum + time, 0) / allTimes.length
        }

        result.errors = this.errors.filter(error => error.endpoint === endpoint)
      }
    })
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  generateReport(): string {
    const totalDuration = (this.endTime - this.startTime) / 1000
    let report = `
Load Test Report
================
Duration: ${totalDuration.toFixed(2)}s
Concurrent Users: ${this.config.concurrentUsers}
Total Errors: ${this.errors.length}

Endpoint Performance:
`

    this.results.forEach((result, endpoint) => {
      const successRate = result.totalRequests > 0 
        ? (result.successfulRequests / result.totalRequests * 100).toFixed(2)
        : '0.00'

      report += `
${endpoint}:
  Total Requests: ${result.totalRequests}
  Successful: ${result.successfulRequests} (${successRate}%)
  Failed: ${result.failedRequests}
  Avg Response Time: ${result.averageResponseTime.toFixed(2)}ms
  Min Response Time: ${result.minResponseTime === Infinity ? 0 : result.minResponseTime}ms
  Max Response Time: ${result.maxResponseTime}ms
  P95 Response Time: ${result.p95ResponseTime.toFixed(2)}ms
  P99 Response Time: ${result.p99ResponseTime.toFixed(2)}ms
  Requests/sec: ${result.requestsPerSecond.toFixed(2)}
  Errors: ${result.errors.length}
`
    })

    if (this.errors.length > 0) {
      report += `\nTop Errors:\n`
      const errorCounts = new Map<string, number>()
      
      this.errors.forEach(error => {
        const key = `${error.endpoint}: ${error.error}`
        errorCounts.set(key, (errorCounts.get(key) || 0) + 1)
      })

      Array.from(errorCounts.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .forEach(([error, count]) => {
          report += `  ${error} (${count} times)\n`
        })
    }

    return report
  }
}

// Predefined test configurations
export const QC_TOOL_LOAD_TESTS: Record<string, LoadTestConfig> = {
  // Light load test - simulates normal usage
  light: {
    baseURL: 'http://localhost:3000',
    concurrentUsers: 5,
    testDuration: 60,
    endpoints: [
      { path: '/api/health', method: 'GET', weight: 1 },
      { path: '/api/projects', method: 'GET', weight: 3 },
      { path: '/api/files/list', method: 'GET', weight: 3 },
      { path: '/api/stats', method: 'GET', weight: 2 },
      { path: '/api/qc-reviews', method: 'GET', weight: 2 }
    ]
  }
}

// Main function to run load tests
export async function runLoadTest(configName: keyof typeof QC_TOOL_LOAD_TESTS): Promise<void> {
  const config = QC_TOOL_LOAD_TESTS[configName]
  if (!config) {
    throw new Error(`Unknown load test configuration: ${configName}`)
  }

  const loadTester = new LoadTester(config)
  
  try {
    const results = await loadTester.runLoadTest()
    const report = loadTester.generateReport()
    
    console.log(report)
    
  } catch (error) {
    console.error('Load test failed:', error)
    throw error
  }
}

// Export the LoadTester class for custom tests
export { LoadTester }
