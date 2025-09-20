import { Router } from 'express';
import axios from 'axios';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const aiRouter = Router();

// AI Service Configuration
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'https://suraksha-ai-service.onrender.com';
const AI_TIMEOUT = 10000; // 10 seconds

// Request schemas
const routeRiskSchema = z.object({
  route: z.object({
    start: z.object({
      lat: z.number(),
      lng: z.number()
    }),
    end: z.object({
      lat: z.number(),
      lng: z.number()
    }),
    waypoints: z.array(z.object({
      lat: z.number(),
      lng: z.number()
    })).optional()
  }),
  time_of_day: z.enum(['morning', 'afternoon', 'evening', 'night']).optional(),
  user_id: z.string().optional()
});

const anomalyDetectionSchema = z.object({
  user_id: z.string(),
  location_data: z.array(z.object({
    lat: z.number(),
    lng: z.number(),
    timestamp: z.string(),
    speed: z.number().optional(),
    accuracy: z.number().optional()
  }))
});

const patternAnalysisSchema = z.object({
  area: z.object({
    center: z.object({
      lat: z.number(),
      lng: z.number()
    }),
    radius_km: z.number()
  }),
  time_range: z.object({
    start: z.string(),
    end: z.string()
  }).optional(),
  incident_types: z.array(z.string()).optional()
});

const threatAssessmentSchema = z.object({
  location: z.object({
    lat: z.number(),
    lng: z.number()
  }),
  user_profile: z.object({
    age_group: z.enum(['young', 'adult', 'senior']).optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    travel_mode: z.enum(['walking', 'driving', 'public_transport']).optional()
  }).optional(),
  context: z.object({
    time_of_day: z.enum(['morning', 'afternoon', 'evening', 'night']).optional(),
    day_of_week: z.string().optional(),
    weather: z.enum(['clear', 'rainy', 'foggy']).optional()
  }).optional()
});

// Route Risk Prediction
aiRouter.post('/risk/predict', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const parse = routeRiskSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        issues: parse.error.issues 
      });
    }

    const { route, time_of_day, user_id } = parse.data;

    // Call AI service
    const aiResponse = await axios.post(
      `${AI_SERVICE_URL}/api/risk/predict`,
      {
        route,
        time_of_day: time_of_day || getCurrentTimeOfDay(),
        user_id: user_id || req.user?.id
      },
      { timeout: AI_TIMEOUT }
    );

    res.json({
      success: true,
      data: aiResponse.data
    });

  } catch (error: any) {
    console.error('Risk prediction error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        error: 'AI service unavailable',
        fallback: {
          risk_score: 30.0,
          risk_level: 'moderate',
          recommendations: ['Exercise normal caution', 'Stay aware of surroundings']
        }
      });
    }

    res.status(500).json({ 
      error: 'Risk prediction failed',
      message: error.response?.data?.error || error.message
    });
  }
});

// Anomaly Detection
aiRouter.post('/anomaly/detect', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const parse = anomalyDetectionSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        issues: parse.error.issues 
      });
    }

    const { user_id, location_data } = parse.data;

    // Ensure user can only check their own anomalies or is admin
    if (user_id !== req.user?.id && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Call AI service
    const aiResponse = await axios.post(
      `${AI_SERVICE_URL}/api/anomaly/detect`,
      { user_id, location_data },
      { timeout: AI_TIMEOUT }
    );

    res.json({
      success: true,
      data: aiResponse.data
    });

  } catch (error: any) {
    console.error('Anomaly detection error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        error: 'AI service unavailable',
        fallback: {
          is_anomaly: false,
          confidence_score: 0.0,
          details: 'Service temporarily unavailable'
        }
      });
    }

    res.status(500).json({ 
      error: 'Anomaly detection failed',
      message: error.response?.data?.error || error.message
    });
  }
});

// Pattern Analysis
aiRouter.post('/patterns/analyze', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const parse = patternAnalysisSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        issues: parse.error.issues 
      });
    }

    const { area, time_range, incident_types } = parse.data;

    // Default time range if not provided
    const defaultTimeRange = time_range || {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
      end: new Date().toISOString()
    };

    // Call AI service
    const aiResponse = await axios.post(
      `${AI_SERVICE_URL}/api/patterns/analyze`,
      {
        area,
        time_range: defaultTimeRange,
        incident_types
      },
      { timeout: AI_TIMEOUT * 2 } // Pattern analysis might take longer
    );

    res.json({
      success: true,
      data: aiResponse.data
    });

  } catch (error: any) {
    console.error('Pattern analysis error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        error: 'AI service unavailable',
        fallback: {
          hotspots: [],
          trends: {},
          risk_zones: [],
          insights: []
        }
      });
    }

    res.status(500).json({ 
      error: 'Pattern analysis failed',
      message: error.response?.data?.error || error.message
    });
  }
});

// Threat Assessment
aiRouter.post('/threat/assess', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const parse = threatAssessmentSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        issues: parse.error.issues 
      });
    }

    const { location, user_profile, context } = parse.data;

    // Default context if not provided
    const defaultContext = context || {
      time_of_day: getCurrentTimeOfDay(),
      day_of_week: new Date().toLocaleDateString('en', { weekday: 'long' }).toLowerCase()
    };

    // Call AI service
    const aiResponse = await axios.post(
      `${AI_SERVICE_URL}/api/threat/assess`,
      {
        location,
        user_profile: user_profile || {},
        context: defaultContext
      },
      { timeout: AI_TIMEOUT }
    );

    res.json({
      success: true,
      data: aiResponse.data
    });

  } catch (error: any) {
    console.error('Threat assessment error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        error: 'AI service unavailable',
        fallback: {
          threat_level: 'moderate',
          threat_score: 30,
          contributing_factors: [],
          recommendations: ['Exercise normal caution']
        }
      });
    }

    res.status(500).json({ 
      error: 'Threat assessment failed',
      message: error.response?.data?.error || error.message
    });
  }
});

// Area Risk Summary (convenience endpoint)
aiRouter.get('/risk/area/:lat/:lng', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const lat = parseFloat(req.params.lat);
    const lng = parseFloat(req.params.lng);
    const radius = parseFloat(req.query.radius as string) || 2.0;

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    // Use pattern analysis to get area risk
    const aiResponse = await axios.post(
      `${AI_SERVICE_URL}/api/patterns/analyze`,
      {
        area: {
          center: { lat, lng },
          radius_km: radius
        },
        time_range: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString()
        }
      },
      { timeout: AI_TIMEOUT }
    );

    // Extract area summary from pattern analysis
    const data = aiResponse.data;
    const totalIncidents = data.trends?.total_incidents || 0;
    const totalPanicAlerts = data.trends?.total_panic_alerts || 0;
    const hotspotCount = data.hotspots?.length || 0;

    res.json({
      success: true,
      data: {
        location: { lat, lng },
        radius_km: radius,
        total_incidents: totalIncidents,
        total_panic_alerts: totalPanicAlerts,
        hotspot_count: hotspotCount,
        risk_level: totalIncidents > 20 ? 'high' : totalIncidents > 10 ? 'moderate' : 'low',
        daily_average: data.trends?.daily_average || 0,
        insights: data.insights || []
      }
    });

  } catch (error: any) {
    console.error('Area risk summary error:', error.message);
    res.status(500).json({ 
      error: 'Area risk summary failed',
      message: error.response?.data?.error || error.message
    });
  }
});

// AI Service Health Check
aiRouter.get('/health', async (req, res) => {
  try {
    const aiResponse = await axios.get(`${AI_SERVICE_URL}/health`, { timeout: 5000 });
    res.json({
      ai_service: aiResponse.data,
      backend_timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(503).json({
      error: 'AI service health check failed',
      status: 'unavailable',
      backend_timestamp: new Date().toISOString()
    });
  }
});

// AI Service Test Endpoint (no auth required for testing)
aiRouter.post('/test/risk/predict', async (req, res) => {
  try {
    const testData = {
      route: {
        start: { lat: 28.6139, lng: 77.2090 },
        end: { lat: 28.5355, lng: 77.3910 }
      },
      time_of_day: "evening"
    };

    // Call AI service directly
    const aiResponse = await axios.post(
      `${AI_SERVICE_URL}/api/risk/predict`,
      testData,
      { timeout: AI_TIMEOUT }
    );

    res.json({
      success: true,
      test_mode: true,
      ai_service_response: aiResponse.data,
      test_data_used: testData
    });
  } catch (error: any) {
    console.error('AI service test error:', error.message);
    res.status(503).json({
      success: false,
      error: 'AI service test failed',
      details: error.message,
      ai_service_url: AI_SERVICE_URL
    });
  }
});

// AI Service Health Check (no auth required for testing)
aiRouter.get('/health', async (req, res) => {
  try {
    const aiResponse = await axios.get(`${AI_SERVICE_URL}/health`, { timeout: AI_TIMEOUT });
    res.json({
      success: true,
      ai_service_status: 'connected',
      ai_service_url: AI_SERVICE_URL,
      ai_response: aiResponse.data
    });
  } catch (error: any) {
    console.error('AI service connection error:', error.message);
    res.status(503).json({
      success: false,
      error: 'AI service unavailable',
      ai_service_url: AI_SERVICE_URL,
      details: error.message
    });
  }
});

// Helper function to determine current time of day
function getCurrentTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date().getHours();
  
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

export { aiRouter };