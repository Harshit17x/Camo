export type UserRole = 'rider' | 'driver' | 'admin';
export type AdminRole = 'super_admin' | 'operations' | 'finance' | 'support';

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  role: UserRole;
  adminRole?: AdminRole;
  phoneNumber?: string;
  createdAt: string;
  walletBalance: number;
  fcmToken?: string;
  isActive?: boolean;
  isSuspended?: boolean;
  language?: string;
  lastActive?: any;
  currentLocation?: { lat: number; lng: number; updatedAt?: any };
  rideOTP?: string;
}

export interface VehicleCategory {
  id: string;
  name: string;
  icon: string;
  baseFare: number;
  perKmRate: number;
  capacity: number;
  isActive: boolean;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userEmail?: string;
  rideId?: string;
  type: 'complaint' | 'review' | 'sos';
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'investigating' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  location?: { lat: number; lng: number };
  createdAt: any;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface DriverProfile {
  uid: string;
  status: 'online' | 'offline' | 'busy';
  currentLocation?: LatLng & { heading?: number };
  vehicleId?: string;
  vehicleType?: string;
  vehicleNo?: string;
  licenseNo?: string;
  profilePhoto?: string;
  licensePhoto?: string;
  aadharNumber?: string;
  aadharPhoto?: string;
  rcBookNumber?: string;
  rcBookPhoto?: string;
  upiNumber?: string;
  rating: number;
  totalRides: number;
  earnings: number;
  documents?: {
    verified: boolean;
  };
  createdAt?: any;
}

export type RideStatus = 'searching' | 'accepted' | 'arrived' | 'started' | 'in_progress' | 'completed' | 'cancelled' | 'scheduled' | 'scheduled_accepted';
export type RideType = string;

export interface LocationInfo {
  address: string;
  lat: number;
  lng: number;
}

export interface RideRequest {
  id: string;
  riderId: string;
  riderName?: string;
  driverId?: string;
  driverName?: string;
  status: RideStatus;
  pickup: LocationInfo;
  dropoff: LocationInfo;
  fare: number;
  rideType: RideType;
  distance?: string;
  duration?: string;
  createdAt: any;
  acceptedAt?: any;
  startedAt?: any;
  completedAt?: any;
  paymentStatus: 'pending' | 'paid';
  paymentMethod: 'card' | 'cash' | 'wallet';
  sosTriggered?: boolean;
  isScheduled?: boolean;
  scheduledTime?: any;
}
