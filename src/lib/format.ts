import type { ServiceType, TripStatus, TripType, VehicleType } from "./types";

export const rupees = (n: number | null | undefined) =>
  n == null ? "—" : `₹${Math.round(n).toLocaleString("en-IN")}`;

export const SERVICE_LABEL: Record<ServiceType, string> = {
  car_with_driver: "Car + driver",
  driver_only: "Driver only",
};

export const TRIP_LABEL: Record<TripType, string> = {
  local: "In town",
  outstation: "Outstation",
  hourly: "By hours",
};

export const VEHICLE_LABEL: Record<VehicleType, string> = {
  hatchback: "Small car",
  sedan: "Sedan",
  suv: "SUV / 7 seater",
};

export const VEHICLE_HINT: Record<VehicleType, string> = {
  hatchback: "4 people · Swift, i20",
  sedan: "4 people · Dzire, Etios",
  suv: "6–7 people · Innova, Ertiga",
};

export const STATUS_LABEL: Record<TripStatus, string> = {
  searching: "Finding driver",
  accepted: "Driver coming",
  arrived: "Driver arrived",
  started: "On trip",
  completed: "Completed",
  cancelled: "Cancelled",
  expired: "No driver found",
};

export function dateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function mmss(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function firstName(name: string | null | undefined): string {
  return (name ?? "").trim().split(/\s+/)[0] || "there";
}

export function initials(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

/** Keep only digits; accept 10-digit Indian numbers with or without +91. */
export function normalisePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  const local = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  return /^[6-9]\d{9}$/.test(local) ? local : null;
}
