import { NextRequest, NextResponse } from 'next/server';
import { MonitoringService } from '@/lib/monitoring';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const metric = searchParams.get('metric');
    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');

    const filters: any = {};
    
    if (metric) filters.metric = metric;
    if (startTime) filters.startTime = new Date(startTime);
    if (endTime) filters.endTime = new Date(endTime);

    const metrics = MonitoringService.getMetrics(filters);

    if (format === 'prometheus') {
      const prometheusFormat = MonitoringService.exportMetrics('prometheus');
      return new NextResponse(prometheusFormat, {
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    return NextResponse.json({
      metrics,
      total: metrics.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}