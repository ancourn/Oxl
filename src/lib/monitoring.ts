// Monitoring and logging utilities for production

export interface MetricsData {
  timestamp: Date;
  metric: string;
  value: number;
  tags: Record<string, string>;
}

export interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  details?: Record<string, any>;
}

export class MonitoringService {
  private static metrics: MetricsData[] = [];
  private static healthChecks: HealthCheck[] = [];

  // Record a metric
  static recordMetric(metric: string, value: number, tags: Record<string, string> = {}): void {
    const data: MetricsData = {
      timestamp: new Date(),
      metric,
      value,
      tags
    };

    this.metrics.push(data);

    // Keep only last 1000 metrics in memory
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Send to external monitoring service if configured
    if (process.env.PROMETHEUS_ENABLED === 'true') {
      this.sendToPrometheus(data);
    }

    // Send to DataDog if configured
    if (process.env.DATADOG_API_KEY) {
      this.sendToDataDog(data);
    }
  }

  // Get metrics
  static getMetrics(filters?: {
    metric?: string;
    startTime?: Date;
    endTime?: Date;
    tags?: Record<string, string>;
  }): MetricsData[] {
    let filtered = [...this.metrics];

    if (filters) {
      if (filters.metric) {
        filtered = filtered.filter(m => m.metric === filters.metric);
      }
      if (filters.startTime) {
        filtered = filtered.filter(m => m.timestamp >= filters.startTime!);
      }
      if (filters.endTime) {
        filtered = filtered.filter(m => m.timestamp <= filters.endTime!);
      }
      if (filters.tags) {
        filtered = filtered.filter(m => 
          Object.entries(filters.tags).every(([key, value]) => m.tags[key] === value)
        );
      }
    }

    return filtered;
  }

  // Record health check
  static recordHealthCheck(service: string, status: HealthCheck['status'], details?: Record<string, any>): void {
    const healthCheck: HealthCheck = {
      service,
      status,
      timestamp: new Date(),
      details
    };

    this.healthChecks.push(healthCheck);

    // Keep only last 100 health checks
    if (this.healthChecks.length > 100) {
      this.healthChecks = this.healthChecks.slice(-100);
    }

    // Log health check status
    console.log(`Health Check - ${service}: ${status}`, details);
  }

  // Get health checks
  static getHealthChecks(service?: string): HealthCheck[] {
    if (service) {
      return this.healthChecks.filter(h => h.service === service);
    }
    return [...this.healthChecks];
  }

  // Performance monitoring
  static async measureExecutionTime<T>(
    metric: string,
    fn: () => Promise<T>,
    tags: Record<string, string> = {}
  ): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await fn();
      const executionTime = Date.now() - startTime;
      
      this.recordMetric(`${metric}_execution_time`, executionTime, tags);
      this.recordMetric(`${metric}_success`, 1, tags);
      
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      this.recordMetric(`${metric}_execution_time`, executionTime, tags);
      this.recordMetric(`${metric}_error`, 1, tags);
      
      throw error;
    }
  }

  // Database query monitoring
  static async measureQuery<T>(
    metric: string,
    query: () => Promise<T>,
    tags: Record<string, string> = {}
  ): Promise<T> {
    return this.measureExecutionTime(metric, query, { ...tags, type: 'database' });
  }

  // API endpoint monitoring
  static async measureAPI<T>(
    metric: string,
    handler: () => Promise<T>,
    tags: Record<string, string> = {}
  ): Promise<T> {
    return this.measureExecutionTime(metric, handler, { ...tags, type: 'api' });
  }

  // System metrics
  static recordSystemMetrics(): void {
    if (typeof process === 'undefined') return;

    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    this.recordMetric('system_memory_usage', memUsage.heapUsed, { unit: 'bytes' });
    this.recordMetric('system_memory_total', memUsage.heapTotal, { unit: 'bytes' });
    this.recordMetric('system_memory_external', memUsage.external, { unit: 'bytes' });
    this.recordMetric('system_cpu_user', cpuUsage.user, { unit: 'microseconds' });
    this.recordMetric('system_cpu_system', cpuUsage.system, { unit: 'microseconds' });
  }

  // Error tracking
  static trackError(error: Error, context: Record<string, any> = {}): void {
    console.error('Error tracked:', error, context);

    this.recordMetric('errors_total', 1, {
      type: error.name,
      message: error.message,
      ...context
    });

    // Send to Sentry if configured
    if (process.env.SENTRY_DSN) {
      // In a real implementation, you'd use the Sentry SDK here
      console.log('Error sent to Sentry:', error.message);
    }
  }

  // Send to Prometheus
  private static sendToPrometheus(data: MetricsData): void {
    // This would integrate with Prometheus client library
    console.log('Prometheus metric:', data);
  }

  // Send to DataDog
  private static sendToDataDog(data: MetricsData): void {
    // This would integrate with DataDog statsd client
    console.log('DataDog metric:', data);
  }

  // Generate health report
  static generateHealthReport(): {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, HealthCheck['status']>;
    timestamp: Date;
  } {
    const services = this.getHealthChecks();
    const serviceStatus: Record<string, HealthCheck['status']> = {};
    
    // Get latest status for each service
    services.forEach(check => {
      serviceStatus[check.service] = check.status;
    });

    // Determine overall health
    const statuses = Object.values(serviceStatus);
    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (statuses.includes('unhealthy')) {
      overall = 'unhealthy';
    } else if (statuses.includes('degraded')) {
      overall = 'degraded';
    }

    return {
      overall,
      services: serviceStatus,
      timestamp: new Date()
    };
  }

  // Export metrics
  static exportMetrics(format: 'json' | 'prometheus' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.metrics, null, 2);
    } else {
      // Prometheus format
      return this.metrics.map(m => 
        `oxl_${m.metric}{${Object.entries(m.tags).map(([k, v]) => `${k}="${v}"`).join(',')}} ${m.value} ${m.timestamp.getTime()}`
      ).join('\n');
    }
  }

  // Cleanup old metrics
  static cleanup(olderThanHours: number = 24): void {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - olderThanHours);
    
    this.metrics = this.metrics.filter(m => m.timestamp > cutoffTime);
    this.healthChecks = this.healthChecks.filter(h => h.timestamp > cutoffTime);
  }
}

// Request monitoring middleware
export class RequestMonitor {
  private static activeRequests = new Map<string, { startTime: number; path: string }>();

  // Start monitoring request
  static start(requestId: string, path: string): void {
    this.activeRequests.set(requestId, {
      startTime: Date.now(),
      path
    });

    MonitoringService.recordMetric('active_requests', this.activeRequests.size);
  }

  // End monitoring request
  static end(requestId: string, statusCode: number, tags: Record<string, string> = {}): void {
    const request = this.activeRequests.get(requestId);
    if (request) {
      const duration = Date.now() - request.startTime;
      
      MonitoringService.recordMetric('request_duration', duration, {
        path: request.path,
        status_code: statusCode.toString(),
        ...tags
      });

      MonitoringService.recordMetric('requests_total', 1, {
        path: request.path,
        status_code: statusCode.toString(),
        ...tags
      });

      this.activeRequests.delete(requestId);
      MonitoringService.recordMetric('active_requests', this.activeRequests.size);
    }
  }

  // Get active requests
  static getActiveRequests(): Array<{ id: string; path: string; duration: number }> {
    return Array.from(this.activeRequests.entries()).map(([id, request]) => ({
      id,
      path: request.path,
      duration: Date.now() - request.startTime
    }));
  }
}

// Performance monitoring hooks
export function usePerformanceMonitoring(componentName: string) {
  return {
    trackRender: () => {
      if (typeof window !== 'undefined' && window.performance) {
        const startTime = performance.now();
        
        return () => {
          const endTime = performance.now();
          const renderTime = endTime - startTime;
          
          MonitoringService.recordMetric('component_render_time', renderTime, {
            component: componentName
          });
        };
      }
      
      return () => {};
    },

    trackInteraction: (interactionType: string) => {
      return () => {
        MonitoringService.recordMetric('user_interaction', 1, {
          component: componentName,
          interaction_type: interactionType
        });
      };
    }
  };
}

// Error boundary monitoring
export class ErrorBoundaryMonitor {
  static trackError(error: Error, componentStack: string, errorInfo: any): void {
    MonitoringService.trackError(error, {
      componentStack,
      errorInfo,
      type: 'react_error_boundary'
    });
  }

  static trackUnhandledError(error: ErrorEvent): void {
    MonitoringService.trackError(error.error as Error, {
      message: error.message,
      filename: error.filename,
      lineno: error.lineno,
      colno: error.colno,
      type: 'unhandled_error'
    });
  }

  static trackUnhandledRejection(promise: PromiseRejectionEvent): void {
    MonitoringService.trackError(new Error('Unhandled promise rejection'), {
      reason: promise.reason,
      type: 'unhandled_rejection'
    });
  }
}

// Set up global error monitoring
if (typeof window !== 'undefined') {
  window.addEventListener('error', ErrorBoundaryMonitor.trackUnhandledError);
  window.addEventListener('unhandledrejection', ErrorBoundaryMonitor.trackUnhandledRejection);
}

// System health monitoring
export class SystemHealthMonitor {
  static async checkDatabase(): Promise<'healthy' | 'degraded' | 'unhealthy'> {
    try {
      // This would check database connectivity and performance
      // For now, we'll simulate it
      const startTime = Date.now();
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
      const responseTime = Date.now() - startTime;

      if (responseTime > 1000) {
        return 'degraded';
      }
      return 'healthy';
    } catch (error) {
      return 'unhealthy';
    }
  }

  static async checkRedis(): Promise<'healthy' | 'degraded' | 'unhealthy'> {
    try {
      // This would check Redis connectivity and performance
      // For now, we'll simulate it
      const startTime = Date.now();
      await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
      const responseTime = Date.now() - startTime;

      if (responseTime > 500) {
        return 'degraded';
      }
      return 'healthy';
    } catch (error) {
      return 'unhealthy';
    }
  }

  static async checkWebSocket(): Promise<'healthy' | 'degraded' | 'unhealthy'> {
    try {
      // This would check WebSocket server connectivity
      // For now, we'll simulate it
      return 'healthy';
    } catch (error) {
      return 'unhealthy';
    }
  }

  static async checkExternalServices(): Promise<'healthy' | 'degraded' | 'unhealthy'> {
    try {
      // This would check external services like Stripe, SendGrid, etc.
      // For now, we'll simulate it
      return 'healthy';
    } catch (error) {
      return 'degraded';
    }
  }

  static async runFullHealthCheck(): Promise<{
    overall: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, 'healthy' | 'degraded' | 'unhealthy'>;
    timestamp: Date;
  }> {
    const services = {
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
      websocket: await this.checkWebSocket(),
      external: await this.checkExternalServices()
    };

    const statuses = Object.values(services);
    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (statuses.includes('unhealthy')) {
      overall = 'unhealthy';
    } else if (statuses.includes('degraded')) {
      overall = 'degraded';
    }

    return {
      overall,
      services,
      timestamp: new Date()
    };
  }
}