/**
 * Haversine formula to compute distance in meters between two GPS coordinates (lat, lon)
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δφ = toRadians(lat2 - lat1);
  const Δλ = toRadians(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c;
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

export interface GeofenceEvaluationResult {
  isWithinGeofence: boolean;
  distanceMeters: number;
  allowedRadiusMeters: number;
  accuracyAcceptable: boolean;
  accuracyMeters?: number;
  requiresException: boolean;
  status: "VERIFIED" | "OUTSIDE_GEOFENCE" | "POOR_ACCURACY" | "LOCATION_MISSING";
  description: string;
}

/**
 * Validates browser/device coordinates against configured branch coordinates.
 * Coordinates are treated as untrusted input and strictly checked server-side.
 */
export function evaluateAttendanceGeofence({
  deviceLat,
  deviceLon,
  accuracyMeters,
  branchLat,
  branchLon,
  geofenceRadiusMeters = 150.0,
  maxAcceptableAccuracyMeters = 100.0,
}: {
  deviceLat?: number | null;
  deviceLon?: number | null;
  accuracyMeters?: number | null;
  branchLat: number;
  branchLon: number;
  geofenceRadiusMeters?: number;
  maxAcceptableAccuracyMeters?: number;
}): GeofenceEvaluationResult {
  if (deviceLat == null || deviceLon == null) {
    return {
      isWithinGeofence: false,
      distanceMeters: -1,
      allowedRadiusMeters: geofenceRadiusMeters,
      accuracyAcceptable: false,
      requiresException: true,
      status: "LOCATION_MISSING",
      description: "No GPS coordinates provided. Location permission denied or device error.",
    };
  }

  // Check accuracy
  const accuracyAcceptable = accuracyMeters == null || accuracyMeters <= maxAcceptableAccuracyMeters;
  if (!accuracyAcceptable) {
    return {
      isWithinGeofence: false,
      distanceMeters: calculateHaversineDistanceMeters(deviceLat, deviceLon, branchLat, branchLon),
      allowedRadiusMeters: geofenceRadiusMeters,
      accuracyAcceptable: false,
      accuracyMeters: accuracyMeters ?? undefined,
      requiresException: true,
      status: "POOR_ACCURACY",
      description: `GPS accuracy (${accuracyMeters}m) exceeds acceptable threshold of ${maxAcceptableAccuracyMeters}m.`,
    };
  }

  const distance = calculateHaversineDistanceMeters(deviceLat, deviceLon, branchLat, branchLon);
  const isWithin = distance <= geofenceRadiusMeters;

  return {
    isWithinGeofence: isWithin,
    distanceMeters: distance,
    allowedRadiusMeters: geofenceRadiusMeters,
    accuracyAcceptable: true,
    accuracyMeters: accuracyMeters ?? undefined,
    requiresException: !isWithin,
    status: isWithin ? "VERIFIED" : "OUTSIDE_GEOFENCE",
    description: isWithin
      ? `Within permitted store geofence (${distance}m from store center).`
      : `Outside geofence boundary: ${distance}m away (limit: ${geofenceRadiusMeters}m). Exception review required.`,
  };
}
