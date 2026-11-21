// Shapes of the rows the backend returns. Keep in sync with driverapp-backend migrations.

export type UserRole = "customer" | "driver";
export type DriverStatus = "pending" | "approved" | "rejected" | "blocked";
export type VehicleType = "hatchback" | "sedan" | "suv";
export type ServiceType = "car_with_driver" | "driver_only";
export type TripType = "local" | "outstation" | "hourly";
export type TripStatus =
  | "searching"
  | "accepted"
  | "arrived"
  | "started"
  | "completed"
  | "cancelled"
  | "expired";
export type OfferResponse = "pending" | "accepted" | "skipped" | "missed";

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  is_admin: boolean;
  push_token: string | null;
  avatar_url: string | null;
  language: string;
};

export type Driver = {
  id: string;
  has_car: boolean;
  vehicle_type: VehicleType | null;
  vehicle_model: string | null;
  vehicle_number: string | null;
  licence_number: string;
  status: DriverStatus;
  is_available: boolean;
  rating_avg: number;
  rating_count: number;
  missed_streak: number;
  rate_note: string | null;
  rate_per_km: number | null;
  rate_per_hour: number | null;
  rate_per_day: number | null;
};

export type Trip = {
  id: string;
  customer_id: string;
  driver_id: string | null;
  service_type: ServiceType;
  trip_type: TripType;
  vehicle_type: VehicleType | null;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  drop_address: string | null;
  drop_lat: number | null;
  drop_lng: number | null;
  distance_km: number | null;
  hours: number | null;
  fare_estimate: number;
  customer_note: string | null;
  requested_driver_id: string | null;
  customer_offer: number | null;
  status: TripStatus;
  search_radius_km: number;
  expires_at: string;
  accepted_at: string | null;
  arrived_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  created_at: string;
};

export type TripOffer = {
  trip_id: string;
  driver_id: string;
  distance_km: number | null;
  response: OfferResponse;
  sent_at: string;
};

/** The other person on a trip, as the app shows them. */
export type TripPerson = {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
};

export type DriverPublic = TripPerson & {
  vehicle_type: VehicleType | null;
  vehicle_model: string | null;
  vehicle_number: string | null;
  has_car: boolean;
  rating_avg: number;
  rating_count: number;
};

/** A free driver in the customer's "near me" list (no phone until they accept). */
export type FreeDriver = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  has_car: boolean;
  vehicle_type: VehicleType | null;
  vehicle_model: string | null;
  rating_avg: number;
  rating_count: number;
  rate_note: string | null;
  rate_per_km: number | null;
  rate_per_hour: number | null;
  rate_per_day: number | null;
  distance_km: number;
};

export type LatLng = { lat: number; lng: number };

export type Place = LatLng & { address: string };

export const ACTIVE_STATUSES: TripStatus[] = ["searching", "accepted", "arrived", "started"];
