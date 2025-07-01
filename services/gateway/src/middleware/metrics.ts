import { Request, Response, NextFunction } from 'express';
import { register, Counter, Histogram, Gauge } from 'prom-client';

// Create metrics
const httpRequestCounter = new Counter({
  name: 'gateway_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

const httpRequestDuration = new Histogram({
  name: 'gateway_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
});

const activeRequests = new Gauge({
  name: 'gateway_active_requests',
  help: 'Number of active requests',
});

// Register metrics
register.registerMetric(httpRequestCounter);
register.registerMetric(httpRequestDuration);
register.registerMetric(activeRequests);

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  activeRequests.inc();

  // Capture the original end function
  const originalEnd = res.end;

  // Override the end function
  res.end = function(...args: any[]) {
    // Restore the original end function
    res.end = originalEnd;
    
    // Call the original end function
    res.end.apply(res, args);

    // Record metrics
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path || 'unknown';
    const labels = {
      method: req.method,
      route: route,
      status_code: res.statusCode.toString(),
    };

    httpRequestCounter.inc(labels);
    httpRequestDuration.observe(labels, duration);
    activeRequests.dec();
  };

  next();
}

export { register };