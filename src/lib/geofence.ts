/**
 * Geofencing & Location Verification Engine for MADAM CHOCOLATE
 * Supports both Circular Geofencing (Haversine distance) and Polygon Geofencing (Ray-Casting Algorithm).
 */

export interface Point {
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
}

export type GeofenceType = "CIRCLE" | "POLYGON";

export interface GeofenceEvaluationResult {
  isWithinGeofence: boolean;
  geofenceType: GeofenceType;
  distanceMeters: number;
  allowedRadiusMeters: number;
  polygonPointsCount?: number;
  accuracyAcceptable: boolean;
  accuracyMeters?: number;
  isFresh: boolean;
  locationAgeSeconds?: number;
  requiresException: boolean;
  status:
    | "VERIFIED"
    | "OUTSIDE_GEOFENCE"
    | "POOR_ACCURACY"
    | "STALE_LOCATION"
    | "LOCATION_MISSING"
    | "CONFIGURATION_INVALID"
    | "INVALID_POLYGON";
  description: string;
}

export const DEFAULT_GEOFENCE_RADIUS_METERS = 150.0;
export const DEFAULT_MAX_ACCURACY_METERS = 50.0;
export const DEFAULT_MAX_LOCATION_AGE_SECONDS = 60; // 60 seconds freshness threshold

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

/**
 * Validates a polygon coordinate array.
 * Must contain at least 3 distinct vertices with valid lat/lng coordinates.
 */
export function validatePolygon(polygonInput: unknown): {
  isValid: boolean;
  error?: string;
  points: { lat: number; lng: number; latitude: number; longitude: number }[];
} {
  let points: any[] = [];

  if (typeof polygonInput === "string") {
    try {
      points = JSON.parse(polygonInput);
    } catch {
      return { isValid: false, error: "Malformed polygon JSON string.", points: [] };
    }
  } else if (Array.isArray(polygonInput)) {
    points = polygonInput;
  } else {
    return { isValid: false, error: "Polygon must be an array of points or valid JSON string.", points: [] };
  }

  if (!Array.isArray(points) || points.length < 3) {
    return {
      isValid: false,
      error: `Polygon boundary requires at least 3 vertices. Found: ${points ? points.length : 0}.`,
      points: [],
    };
  }

  const normalized: { lat: number; lng: number; latitude: number; longitude: number }[] = [];

  // Validate each point
  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    const rawLat = pt?.lat ?? pt?.latitude;
    const rawLng = pt?.lng ?? pt?.longitude;
    const lat = typeof rawLat === "number" ? rawLat : parseFloat(String(rawLat));
    const lng = typeof rawLng === "number" ? rawLng : parseFloat(String(rawLng));

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return {
        isValid: false,
        error: `Vertex #${i + 1} contains invalid coordinates (lat: ${rawLat}, lng: ${rawLng}). Coordinates must be valid numbers within [-90, 90] and [-180, 180].`,
        points: [],
      };
    }
    normalized.push({ lat, lng, latitude: lat, longitude: lng });
  }

  // Check distinct vertices
  const uniqueKeys = new Set(normalized.map((p) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`));
  if (uniqueKeys.size < 3) {
    return {
      isValid: false,
      error: "Polygon has fewer than 3 unique vertices.",
      points: [],
    };
  }

  return { isValid: true, points: normalized };
}

/**
 * Determines whether a GPS coordinate is inside a polygon using the Ray-Casting algorithm.
 * Handles vertices and boundary edges with standard Jordan curve theorem.
 */
export function isPointInPolygon(
  point: { lat?: number; lng?: number; latitude?: number; longitude?: number },
  polygon: Point[]
): boolean {
  if (!polygon || polygon.length < 3) return false;

  const px = point.lng ?? point.longitude;
  const py = point.lat ?? point.latitude;
  if (px == null || py == null || isNaN(px) || isNaN(py)) return false;

  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const ptI = polygon[i];
    const ptJ = polygon[j];

    const x1 = ptI.lng ?? ptI.longitude;
    const y1 = ptI.lat ?? ptI.latitude;
    const x2 = ptJ.lng ?? ptJ.longitude;
    const y2 = ptJ.lat ?? ptJ.latitude;

    if (x1 == null || y1 == null || x2 == null || y2 == null) continue;

    // Check if point is on vertex or line segment between ptI and ptJ
    const minX = Math.min(x1, x2) - 1e-7;
    const maxX = Math.max(x1, x2) + 1e-7;
    const minY = Math.min(y1, y2) - 1e-7;
    const maxY = Math.max(y1, y2) + 1e-7;

    if (px >= minX && px <= maxX && py >= minY && py <= maxY) {
      const crossProduct = Math.abs((px - x1) * (y2 - y1) - (py - y1) * (x2 - x1));
      const segmentLenSq = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
      if (segmentLenSq > 0 && (crossProduct * crossProduct) / segmentLenSq < 1e-12) {
        // Point is directly on boundary edge/vertex!
        return true;
      }
    }

    const intersect =
      y1 > py !== y2 > py && px < ((x2 - x1) * (py - y1)) / (y2 - y1) + x1;

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Evaluates device coordinates against configured workplace boundaries.
 * Strictly verifies freshness, accuracy, and geometry (Circle or Polygon).
 */
export function evaluateAttendanceGeofence({
  deviceLat,
  deviceLon,
  accuracyMeters,
  locationTimestamp,
  branchLat,
  branchLon,
  geofenceType = "CIRCLE",
  geofenceRadiusMeters = DEFAULT_GEOFENCE_RADIUS_METERS,
  geofencePolygonJson,
  polygonPoints,
  polygonPointsJson,
  maxAcceptableAccuracyMeters = DEFAULT_MAX_ACCURACY_METERS,
  maxLocationAgeSeconds = DEFAULT_MAX_LOCATION_AGE_SECONDS,
}: {
  deviceLat?: number | null;
  deviceLon?: number | null;
  accuracyMeters?: number | null;
  locationTimestamp?: number | Date | null;
  branchLat?: number | null;
  branchLon?: number | null;
  geofenceType?: GeofenceType | string;
  geofenceRadiusMeters?: number;
  geofencePolygonJson?: string | Point[] | null;
  polygonPoints?: Point[];
  polygonPointsJson?: string | null;
  maxAcceptableAccuracyMeters?: number;
  maxLocationAgeSeconds?: number;
}): GeofenceEvaluationResult {
  const effectiveType: GeofenceType =
    geofenceType?.toUpperCase() === "POLYGON" ? "POLYGON" : "CIRCLE";

  // 1. Missing or non-numeric coordinates check
  const numDeviceLat = typeof deviceLat === "number" ? deviceLat : Number(deviceLat);
  const numDeviceLon = typeof deviceLon === "number" ? deviceLon : Number(deviceLon);

  if (
    deviceLat == null ||
    deviceLon == null ||
    isNaN(numDeviceLat) ||
    isNaN(numDeviceLon) ||
    (numDeviceLat === 0 && numDeviceLon === 0)
  ) {
    return {
      isWithinGeofence: false,
      geofenceType: effectiveType,
      distanceMeters: -1,
      allowedRadiusMeters: geofenceRadiusMeters,
      accuracyAcceptable: false,
      isFresh: false,
      requiresException: true,
      status: "LOCATION_MISSING",
      description: "No GPS coordinates provided or invalid format. Please enable device location services and allow browser access.",
    };
  }

  // 2. Validate branch center coordinates configuration
  if (branchLat == null || branchLon == null || isNaN(branchLat) || isNaN(branchLon)) {
    return {
      isWithinGeofence: false,
      geofenceType: effectiveType,
      distanceMeters: -1,
      allowedRadiusMeters: geofenceRadiusMeters,
      accuracyAcceptable: false,
      isFresh: false,
      requiresException: true,
      status: "CONFIGURATION_INVALID",
      description: "Company branch coordinates are not configured. Please contact an administrator.",
    };
  }

  const distanceToCenter = calculateHaversineDistanceMeters(numDeviceLat, numDeviceLon, branchLat, branchLon);

  // 3. Freshness validation
  let isFresh = true;
  let locationAgeSeconds = 0;
  if (locationTimestamp != null) {
    const timeMs = locationTimestamp instanceof Date ? locationTimestamp.getTime() : Number(locationTimestamp);
    if (!isNaN(timeMs) && timeMs > 0) {
      locationAgeSeconds = Math.max(0, Math.round((Date.now() - timeMs) / 1000));
      if (locationAgeSeconds > maxLocationAgeSeconds) {
        return {
          isWithinGeofence: false,
          geofenceType: effectiveType,
          distanceMeters: distanceToCenter,
          allowedRadiusMeters: geofenceRadiusMeters,
          accuracyAcceptable: accuracyMeters == null || accuracyMeters <= maxAcceptableAccuracyMeters,
          accuracyMeters: accuracyMeters ?? undefined,
          isFresh: false,
          locationAgeSeconds,
          requiresException: true,
          status: "STALE_LOCATION",
          description: `Location reading is stale (${locationAgeSeconds}s old > ${maxLocationAgeSeconds}s limit). Please acquire fresh GPS fix.`,
        };
      }
    }
  }

  // 4. Accuracy validation
  const accuracyAcceptable = accuracyMeters == null || accuracyMeters <= maxAcceptableAccuracyMeters;
  if (!accuracyAcceptable) {
    return {
      isWithinGeofence: false,
      geofenceType: effectiveType,
      distanceMeters: distanceToCenter,
      allowedRadiusMeters: geofenceRadiusMeters,
      accuracyAcceptable: false,
      accuracyMeters: accuracyMeters ?? undefined,
      isFresh: true,
      locationAgeSeconds,
      requiresException: true,
      status: "POOR_ACCURACY",
      description: `Location Accuracy Insufficient — GPS accuracy (±${accuracyMeters}m) exceeds acceptable threshold of ${maxAcceptableAccuracyMeters}m. Move to an open area with clear sky view.`,
    };
  }

  // 5. Geometry Check (Polygon or Circle)
  if (effectiveType === "POLYGON") {
    const polyInput = polygonPoints ?? geofencePolygonJson ?? polygonPointsJson;
    const polyValidation = validatePolygon(polyInput);
    if (!polyValidation.isValid) {
      return {
        isWithinGeofence: false,
        geofenceType: "POLYGON",
        distanceMeters: distanceToCenter,
        allowedRadiusMeters: geofenceRadiusMeters,
        accuracyAcceptable: true,
        accuracyMeters: accuracyMeters ?? undefined,
        isFresh: true,
        locationAgeSeconds,
        requiresException: true,
        status: "INVALID_POLYGON",
        description: `Company polygon geofence configuration is invalid: ${polyValidation.error}`,
      };
    }

    const insidePolygon = isPointInPolygon(
      { lat: numDeviceLat, lng: numDeviceLon },
      polyValidation.points
    );

    return {
      isWithinGeofence: insidePolygon,
      geofenceType: "POLYGON",
      distanceMeters: distanceToCenter,
      allowedRadiusMeters: geofenceRadiusMeters,
      polygonPointsCount: polyValidation.points.length,
      accuracyAcceptable: true,
      accuracyMeters: accuracyMeters ?? undefined,
      isFresh: true,
      locationAgeSeconds,
      requiresException: !insidePolygon,
      status: insidePolygon ? "VERIFIED" : "OUTSIDE_GEOFENCE",
      description: insidePolygon
        ? `Inside authorized company premises (Polygon boundary with ${polyValidation.points.length} vertices).`
        : `Location warning: You are outside the authorized workplace area. Move inside the registered boundary and try again. Your attendance has not been confirmed. Device is outside the designated polygon boundary (${distanceToCenter}m from boutique center).`,
    };
  }

  // Default: CIRCLE Mode (allow 0.05m floating tolerance for exact boundary points)
  const isWithinCircle = distanceToCenter <= geofenceRadiusMeters + 0.05;

  return {
    isWithinGeofence: isWithinCircle,
    geofenceType: "CIRCLE",
    distanceMeters: distanceToCenter,
    allowedRadiusMeters: geofenceRadiusMeters,
    accuracyAcceptable: true,
    accuracyMeters: accuracyMeters ?? undefined,
    isFresh: true,
    locationAgeSeconds,
    requiresException: !isWithinCircle,
    status: isWithinCircle ? "VERIFIED" : "OUTSIDE_GEOFENCE",
    description: isWithinCircle
      ? `Inside authorized workplace area (${distanceToCenter}m from boutique center; limit: ${geofenceRadiusMeters}m).`
      : `Location warning: You are outside the authorized workplace area. Move inside the registered boundary and try again. Your attendance has not been confirmed. (${distanceToCenter}m away; permitted radius: ${geofenceRadiusMeters}m).`,
  };
}
