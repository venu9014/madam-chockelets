import { describe, it, expect } from "vitest";
import {
  evaluateAttendanceGeofence,
  validatePolygon,
  isPointInPolygon,
  calculateHaversineDistanceMeters,
} from "../../src/lib/geofence";

describe("GPS Location & Geofence 15-Scenario Matrix", () => {
  // Indiranagar store coordinates: 12.9783, 77.6408, 150m radius
  const STORE_LAT = 12.9783;
  const STORE_LON = 77.6408;
  const GEOFENCE_RADIUS = 150.0;
  const MAX_ACCURACY = 50.0;
  const MAX_AGE_SECONDS = 60;

  // Polygon vertices around store (~200m box)
  const POLYGON_VERTICES = [
    { latitude: 12.9795, longitude: 77.6395 },
    { latitude: 12.9795, longitude: 77.6420 },
    { latitude: 12.9770, longitude: 77.6420 },
    { latitude: 12.9770, longitude: 77.6395 },
  ];

  // Scenario 1: Valid fresh coordinates inside boundary
  it("Scenario 1: Fresh coordinates within circular and polygon boundaries", () => {
    const result = evaluateAttendanceGeofence({
      deviceLat: STORE_LAT + 0.0001, // ~11 meters away
      deviceLon: STORE_LON + 0.0001,
      accuracyMeters: 10.0,
      locationTimestamp: Date.now(),
      branchLat: STORE_LAT,
      branchLon: STORE_LON,
      geofenceRadiusMeters: GEOFENCE_RADIUS,
      maxAcceptableAccuracyMeters: MAX_ACCURACY,
      maxLocationAgeSeconds: MAX_AGE_SECONDS,
    });

    expect(result.isWithinGeofence).toBe(true);
    expect(result.accuracyAcceptable).toBe(true);
    expect(result.distanceMeters).toBeLessThan(50);
  });

  // Scenario 2: Coordinates outside boundary
  it("Scenario 2: Coordinates outside boundary (>700m away) must be rejected", () => {
    const result = evaluateAttendanceGeofence({
      deviceLat: STORE_LAT + 0.007,
      deviceLon: STORE_LON + 0.007,
      accuracyMeters: 15.0,
      locationTimestamp: Date.now(),
      branchLat: STORE_LAT,
      branchLon: STORE_LON,
      geofenceRadiusMeters: GEOFENCE_RADIUS,
      maxAcceptableAccuracyMeters: MAX_ACCURACY,
    });

    expect(result.isWithinGeofence).toBe(false);
    expect(result.requiresException).toBe(true);
    expect(result.distanceMeters).toBeGreaterThan(700);
  });

  // Scenario 3: Coordinates near boundary (e.g. 140m away, just inside 150m)
  it("Scenario 3: Coordinates near the perimeter (~135m away) within radius", () => {
    // 0.001 deg lat is approximately 111 meters
    const result = evaluateAttendanceGeofence({
      deviceLat: STORE_LAT + 0.0012, // ~133 meters away
      deviceLon: STORE_LON,
      accuracyMeters: 10.0,
      locationTimestamp: Date.now(),
      branchLat: STORE_LAT,
      branchLon: STORE_LON,
      geofenceRadiusMeters: 150.0,
      maxAcceptableAccuracyMeters: MAX_ACCURACY,
    });

    expect(result.distanceMeters).toBeGreaterThan(120);
    expect(result.distanceMeters).toBeLessThan(150);
    expect(result.isWithinGeofence).toBe(true);
  });

  // Scenario 4: Coordinates on boundary policy (distance <= radiusMeters)
  it("Scenario 4: Boundary policy: distance <= radiusMeters is inside, > radiusMeters is outside", () => {
    const distInside = calculateHaversineDistanceMeters(STORE_LAT, STORE_LON, STORE_LAT + 0.0013, STORE_LON);
    const resultInside = evaluateAttendanceGeofence({
      deviceLat: STORE_LAT + 0.0013,
      deviceLon: STORE_LON,
      accuracyMeters: 5.0,
      locationTimestamp: Date.now(),
      branchLat: STORE_LAT,
      branchLon: STORE_LON,
      geofenceRadiusMeters: distInside + 1, // 1m inside
    });
    expect(resultInside.isWithinGeofence).toBe(true);

    const resultOutside = evaluateAttendanceGeofence({
      deviceLat: STORE_LAT + 0.0013,
      deviceLon: STORE_LON,
      accuracyMeters: 5.0,
      locationTimestamp: Date.now(),
      branchLat: STORE_LAT,
      branchLon: STORE_LON,
      geofenceRadiusMeters: distInside - 1, // 1m outside
    });
    expect(resultOutside.isWithinGeofence).toBe(false);
  });

  // Scenario 5: Invalid polygon configuration (<3 vertices or duplicate coordinates)
  it("Scenario 5: Invalid polygon (<3 vertices or malformed JSON) rejected", () => {
    const invalidPolygon = [{ lat: STORE_LAT, lng: STORE_LON }];
    const validation = validatePolygon(invalidPolygon);
    expect(validation.isValid).toBe(false);
    expect(validation.error).toContain("at least 3 vertices");

    const nonArrayValidation = validatePolygon("not-an-array" as any);
    expect(nonArrayValidation.isValid).toBe(false);
    expect(nonArrayValidation.error).toContain("Malformed polygon");
  });

  // Scenario 6: Missing company coordinates or geofence
  it("Scenario 6: Missing store latitude/longitude in configuration fails gracefully", () => {
    const result = evaluateAttendanceGeofence({
      deviceLat: STORE_LAT,
      deviceLon: STORE_LON,
      accuracyMeters: 10.0,
      branchLat: null as any,
      branchLon: null as any,
      geofenceRadiusMeters: GEOFENCE_RADIUS,
    });

    expect(result.isWithinGeofence).toBe(false);
    expect(result.requiresException).toBe(true);
  });

  // Scenario 7: GPS permission denied (null device coordinates)
  it("Scenario 7: GPS permission denied (null coordinates) must be rejected", () => {
    const result = evaluateAttendanceGeofence({
      deviceLat: null as any,
      deviceLon: null as any,
      accuracyMeters: null as any,
      branchLat: STORE_LAT,
      branchLon: STORE_LON,
      geofenceRadiusMeters: GEOFENCE_RADIUS,
    });

    expect(result.isWithinGeofence).toBe(false);
    expect(result.requiresException).toBe(true);
    expect(result.distanceMeters).toBe(-1);
  });

  // Scenario 8: Location services disabled (undefined coordinates)
  it("Scenario 8: Location services disabled (undefined coordinates) must be rejected", () => {
    const result = evaluateAttendanceGeofence({
      deviceLat: undefined as any,
      deviceLon: undefined as any,
      branchLat: STORE_LAT,
      branchLon: STORE_LON,
      geofenceRadiusMeters: GEOFENCE_RADIUS,
    });

    expect(result.isWithinGeofence).toBe(false);
  });

  // Scenario 9: GPS timeout (no coordinates captured, 0,0)
  it("Scenario 9: GPS timeout resulting in empty coordinate payload (0,0) must be rejected", () => {
    const result = evaluateAttendanceGeofence({
      deviceLat: 0,
      deviceLon: 0,
      branchLat: STORE_LAT,
      branchLon: STORE_LON,
      geofenceRadiusMeters: GEOFENCE_RADIUS,
    });

    expect(result.isWithinGeofence).toBe(false);
    expect(result.status).toBe("LOCATION_MISSING");
    expect(result.distanceMeters).toBe(-1);
  });

  // Scenario 10: Null, invalid, or out-of-range coordinates (e.g. lat > 90)
  it("Scenario 10: Out of range coordinates (lat: 195.0, lon: 350.0) must fail", () => {
    const invalidPolygon = [
      { lat: 195.0, lng: 77.0 },
      { lat: 12.0, lng: 77.0 },
      { lat: 12.0, lng: 78.0 },
    ];
    const validation = validatePolygon(invalidPolygon);
    expect(validation.isValid).toBe(false);
    expect(validation.error).toContain("invalid coordinates");
  });

  // Scenario 11: Stale cached location (>60 seconds old)
  it("Scenario 11: Stale cached location (age > maxLocationAgeSeconds) must be rejected", () => {
    const staleTimestamp = Date.now() - 180 * 1000; // 3 minutes old
    const result = evaluateAttendanceGeofence({
      deviceLat: STORE_LAT,
      deviceLon: STORE_LON,
      accuracyMeters: 10.0,
      locationTimestamp: staleTimestamp,
      branchLat: STORE_LAT,
      branchLon: STORE_LON,
      geofenceRadiusMeters: GEOFENCE_RADIUS,
      maxLocationAgeSeconds: 60,
    });

    expect(result.isWithinGeofence).toBe(false);
    expect(result.requiresException).toBe(true);
    expect(result.description).toContain("Location reading is stale");
  });

  // Scenario 12: Accuracy worse than configured threshold (accuracy > maxGpsAccuracyMeters)
  it("Scenario 12: Poor GPS accuracy (e.g. 120m accuracy vs 50m max) must be rejected", () => {
    const result = evaluateAttendanceGeofence({
      deviceLat: STORE_LAT,
      deviceLon: STORE_LON,
      accuracyMeters: 120.0, // Low accuracy cell tower triangulation
      locationTimestamp: Date.now(),
      branchLat: STORE_LAT,
      branchLon: STORE_LON,
      geofenceRadiusMeters: GEOFENCE_RADIUS,
      maxAcceptableAccuracyMeters: 50.0,
    });

    expect(result.isWithinGeofence).toBe(false);
    expect(result.accuracyAcceptable).toBe(false);
    expect(result.requiresException).toBe(true);
    expect(result.description).toContain("accuracy");
  });

  // Scenario 13: A different branch's coordinates (Whitefield coordinates vs Indiranagar branch)
  it("Scenario 13: Attempting Indiranagar punch-in while physically at Whitefield branch (~14km away)", () => {
    const WHITEFIELD_LAT = 12.9698;
    const WHITEFIELD_LON = 77.7499;

    const result = evaluateAttendanceGeofence({
      deviceLat: WHITEFIELD_LAT,
      deviceLon: WHITEFIELD_LON,
      accuracyMeters: 15.0,
      branchLat: STORE_LAT,
      branchLon: STORE_LON,
      geofenceRadiusMeters: GEOFENCE_RADIUS,
    });

    expect(result.isWithinGeofence).toBe(false);
    expect(result.distanceMeters).toBeGreaterThan(10000); // >10km away
  });

  // Scenario 14: Polygon Ray-Casting correctly identifies external point just outside boundary
  it("Scenario 14: Polygon geofence correctly rejects point outside complex polygon boundary", () => {
    const pointOutside = { lat: 12.9850, lng: 77.6408 }; // Outside northern boundary
    const isInside = isPointInPolygon(pointOutside, POLYGON_VERTICES);
    expect(isInside).toBe(false);

    const pointInside = { lat: 12.9783, lng: 77.6408 }; // Inside polygon
    expect(isPointInPolygon(pointInside, POLYGON_VERTICES)).toBe(true);
  });

  // Scenario 15: Non-numeric coordinate string values handled safely without NaN crash
  it("Scenario 15: Non-numeric coordinate input string handled safely", () => {
    const result = evaluateAttendanceGeofence({
      deviceLat: "abc" as any,
      deviceLon: "xyz" as any,
      branchLat: STORE_LAT,
      branchLon: STORE_LON,
      geofenceRadiusMeters: GEOFENCE_RADIUS,
    });

    expect(result.isWithinGeofence).toBe(false);
    expect(result.distanceMeters).toBe(-1);
  });
});
