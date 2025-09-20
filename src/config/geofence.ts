export interface GeofenceArea { id: string; name: string; center: [number, number]; radiusMeters: number; risk: 'low'|'medium'|'high'; }

// Placeholder static geofences; in production load from DB
export const GEOFENCES: GeofenceArea[] = [
  { id: 'area1', name: 'Heritage Site', center: [85.8245, 20.256], radiusMeters: 500, risk: 'low' },
  { id: 'area2', name: 'Crowded Market', center: [85.821, 20.25], radiusMeters: 300, risk: 'medium' },
  { id: 'area3', name: 'Isolated Stretch', center: [85.80, 20.27], radiusMeters: 800, risk: 'high' }
];

export function distanceMeters(a: [number,number], b: [number,number]) {
  const toRad = (d: number) => d * Math.PI / 180;
  const R = 6371000;
  const dLat = toRad(b[1]-a[1]);
  const dLon = toRad(b[0]-a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const sinDLat = Math.sin(dLat/2), sinDLon = Math.sin(dLon/2);
  const h = sinDLat*sinDLat + Math.cos(lat1)*Math.cos(lat2)*sinDLon*sinDLon;
  return 2*R*Math.asin(Math.sqrt(h));
}

export function evaluateGeofences(point: [number,number]) {
  const hits = GEOFENCES.filter(f => distanceMeters(point, f.center) <= f.radiusMeters)
    .sort((a,b) => a.radiusMeters - b.radiusMeters);
  return hits;
}
