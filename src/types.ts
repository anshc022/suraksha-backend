export interface User {
  id: string;
  email: string;
  role: 'tourist' | 'admin' | 'officer';
}

export interface PanicAlertPayload {
  lat: number;
  lng: number;
  timestamp: string;
  userId: string;
}
