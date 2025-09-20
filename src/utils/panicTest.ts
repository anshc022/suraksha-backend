import { Request, Response } from 'express';
import { PanicAlertModel } from '../models/PanicAlert';

// Health check for panic system
export async function testPanicSystem(req: Request, res: Response) {
  try {
    // Test database connection
    const alertCount = await PanicAlertModel.countDocuments();
    
    // Test response
    res.json({
      status: 'ok',
      panicSystem: 'operational',
      totalAlerts: alertCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Panic system test failed:', error);
    res.status(500).json({
      status: 'error',
      panicSystem: 'failed',
      error: 'Database connection failed'
    });
  }
}