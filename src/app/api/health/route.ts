import { NextRequest, NextResponse } from 'next/server';
import { MonitoringService, SystemHealthMonitor } from '@/lib/monitoring';

export async function GET(request: NextRequest) {
  try {
    // Run basic health check
    const healthReport = MonitoringService.generateHealthReport();
    
    // Run full system health check
    const systemHealth = await SystemHealthMonitor.runFullHealthCheck();
    
    // Get current metrics
    const metrics = MonitoringService.getMetrics();
    
    // Get active requests
    const activeRequests = {
      count: metrics.filter(m => m.metric === 'active_requests').pop()?.value || 0,
      details: [] // Would include actual request details in production
    };

    // System info
    const systemInfo = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    };

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      health: healthReport,
      system: systemHealth,
      metrics: {
        activeRequests,
        totalRequests: metrics.filter(m => m.metric === 'requests_total').length,
        errorCount: metrics.filter(m => m.metric === 'errors_total').length,
        averageResponseTime: calculateAverageResponseTime(metrics)
      },
      systemInfo,
      version: process.env.npm_package_version || '1.0.0'
    });

  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function calculateAverageResponseTime(metrics: any[]): number {
  const responseTimes = metrics
    .filter(m => m.metric === 'request_duration')
    .map(m => m.value);
  
  if (responseTimes.length === 0) return 0;
  
  return Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length);
}