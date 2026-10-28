import { describe, it, expect } from "vitest";
import {
  calculateHaversineDistanceMeters,
  evaluateAttendanceGeofence,
  validatePolygon,
  isPointInPolygon,
  Point,
} from "../../src/lib/geofence";

describe("Geofence & Attendance Unit Tests", () => {
  // Indiranagar store coordinates: 12.9784 N, 77.6408 E
  const STORE_LAT = 12.9784;
  const STORE_LON = 77.6408;

  // Sample Polygon vertices around Indiranagar store
  const SAMPLE_POLYGON: Point[] = [
    { latitude: 12.9790, longitude: 77.6400 },
    { latitude: 12.9790, longitude: 77.6416 },
    { latitude: 12.9778, longitude: 77.6416 },
    { latitude: 12.9778, longitude: 77.6400 },
  ];

  describe("Haversine Distance Formula", () => {
    it("should compute near-zero distance for identical coordinates", () => {
      const dist = calculateHaversineDistanceMeters(STORE_LAT, STORE_LON, STORE_LAT, STORE_LON);
      expect(dist).toBe(0);
    });

    it("should compute accurate distance for a small coordinate delta (~32 meters)", () => {
      // 0.0002 deg latitude delta in Bengaluru is approximately 22 meters
      const dist = calculateHaversineDistanceMeters(STORE_LAT, STORE_LON, STORE_LAT + 0.0002, STORE_LON);
      expect(dist).toBeGreaterThan(15);
      expect(dist).toBeLessThan(30);
    });
  });

  describe("Polygon Geofencing & Ray-Casting Algorithm", () => {
    it("should validate a valid polygon with 3 or more points", () => {
      const result = validatePolygon(SAMPLE_POLYGON);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should reject an invalid polygon with fewer than 3 vertices", () => {
      const invalidPolygon = [
        { latitude: 12.9790, longitude: 77.6400 },
        { latitude: 12.9790, longitude: 77.6416 },
      ];
      const result = validatePolygon(invalidPolygon);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("at least 3 vertices");
    });

    it("should reject non-numeric coordinates in polygon", () => {
      const invalid = [
        { latitude: 12.9790, longitude: 77.6400 },
        { latitude: NaN, longitude: 77.6416 },
        { latitude: 12.9778, longitude: 77.6416 },
      ];
      const result = validatePolygon(invalid);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("valid numbers");
    });

    it("should correctly detect a point INSIDE the polygon using Ray-Casting", () => {
      // Center of sample polygon (12.9784, 77.6408)
      const inside = isPointInPolygon({ latitude: 12.9784, longitude: 77.6408 }, SAMPLE_POLYGON);
      expect(inside).toBe(true);
    });

    it("should correctly detect a point OUTSIDE the polygon using Ray-Casting", () => {
      // Well outside to the north (12.9850, 77.6408)
      const outside = isPointInPolygon({ latitude: 12.9850, longitude: 77.6408 }, SAMPLE_POLYGON);
      expect(outside).toBe(false);
    });
  });

  describe("evaluateAttendanceGeofence - Circular Mode", () => {
    it("should mark punch inside circular geofence when distance <= 150m and accuracy is good", () => {
      const result = evaluateAttendanceGeofence({
        deviceLat: STORE_LAT + 0.0002,
        deviceLon: STORE_LON + 0.0002,
        accuracyMeters: 15.0,
        branchLat: STORE_LAT,
        branchLon: STORE_LON,
        geofenceRadiusMeters: 150.0,
        geofenceType: "CIRCLE",
      });

      expect(result.isWithinGeofence).toBe(true);
      expect(result.requiresException).toBe(false);
      expect(result.status).toBe("VERIFIED");
      expect(result.geofenceType).toBe("CIRCLE");
    });

    it("should flag exception when device is outside circular geofence boundary", () => {
      // 0.007 deg away (~750m)
      const result = evaluateAttendanceGeofence({
        deviceLat: STORE_LAT + 0.007,
        deviceLon: STORE_LON + 0.007,
        accuracyMeters: 18.0,
        branchLat: STORE_LAT,
        branchLon: STORE_LON,
        geofenceRadiusMeters: 150.0,
        geofenceType: "CIRCLE",
      });

      expect(result.isWithinGeofence).toBe(false);
      expect(result.requiresException).toBe(true);
      expect(result.status).toBe("OUTSIDE_GEOFENCE");
    });
  });

  describe("evaluateAttendanceGeofence - Polygon Mode", () => {
    it("should verify attendance when device is inside polygon geofence", () => {
      const result = evaluateAttendanceGeofence({
        deviceLat: STORE_LAT, // 12.9784 (inside SAMPLE_POLYGON)
        deviceLon: STORE_LON, // 77.6408
        accuracyMeters: 10.0,
        branchLat: STORE_LAT,
        branchLon: STORE_LON,
        geofenceType: "POLYGON",
        polygonPoints: SAMPLE_POLYGON,
      });

      expect(result.isWithinGeofence).toBe(true);
      expect(result.requiresException).toBe(false);
      expect(result.status).toBe("VERIFIED");
      expect(result.geofenceType).toBe("POLYGON");
      expect(result.description).toContain("Polygon boundary");
    });


    it("should reject attendance when device is outside polygon geofence", () => {
      const result = evaluateAttendanceGeofence({
        deviceLat: 12.9850, // Outside polygon
        deviceLon: 77.6408,
        accuracyMeters: 10.0,
        branchLat: STORE_LAT,
        branchLon: STORE_LON,
        geofenceType: "POLYGON",
        polygonPoints: SAMPLE_POLYGON,
      });

      expect(result.isWithinGeofence).toBe(false);
      expect(result.requiresException).toBe(true);
      expect(result.status).toBe("OUTSIDE_GEOFENCE");
      expect(result.description).toContain("outside the designated polygon boundary");
    });

    it("should reject invalid polygon configuration (< 3 vertices)", () => {
      const result = evaluateAttendanceGeofence({
        deviceLat: STORE_LAT,
        deviceLon: STORE_LON,
        accuracyMeters: 10.0,
        branchLat: STORE_LAT,
        branchLon: STORE_LON,
        geofenceType: "POLYGON",
        polygonPoints: [{ latitude: 12.9784, longitude: 77.6408 }], // Only 1 point
      });

      expect(result.isWithinGeofence).toBe(false);
      expect(result.requiresException).toBe(true);
      expect(result.status).toBe("INVALID_POLYGON");
    });
  });

  describe("Telemetry Freshness & Accuracy Safeguards", () => {
    it("should reject stale client location timestamp (> maxLocationAgeSeconds)", () => {
      const twoMinutesAgo = Date.now() - 120_000;

      const result = evaluateAttendanceGeofence({
        deviceLat: STORE_LAT,
        deviceLon: STORE_LON,
        accuracyMeters: 10.0,
        locationTimestamp: twoMinutesAgo,
        maxLocationAgeSeconds: 60,
        branchLat: STORE_LAT,
        branchLon: STORE_LON,
        geofenceRadiusMeters: 150.0,
      });

      expect(result.isWithinGeofence).toBe(false);
      expect(result.requiresException).toBe(true);
      expect(result.status).toBe("STALE_LOCATION");
      expect(result.description).toContain("Location reading is stale");
    });

    it("should accept fresh location timestamp (< maxLocationAgeSeconds)", () => {
      const tenSecondsAgo = Date.now() - 10_000;

      const result = evaluateAttendanceGeofence({
        deviceLat: STORE_LAT,
        deviceLon: STORE_LON,
        accuracyMeters: 10.0,
        locationTimestamp: tenSecondsAgo,
        maxLocationAgeSeconds: 60,
        branchLat: STORE_LAT,
        branchLon: STORE_LON,
        geofenceRadiusMeters: 150.0,
      });

      expect(result.isWithinGeofence).toBe(true);
      expect(result.status).toBe("VERIFIED");
    });

    it("should flag exception when accuracy exceeds acceptable threshold (>100m)", () => {
      const result = evaluateAttendanceGeofence({
        deviceLat: STORE_LAT,
        deviceLon: STORE_LON,
        accuracyMeters: 250.0, // Poor cellular accuracy
        branchLat: STORE_LAT,
        branchLon: STORE_LON,
        geofenceRadiusMeters: 150.0,
        maxAcceptableAccuracyMeters: 100.0,
      });

      expect(result.accuracyAcceptable).toBe(false);
      expect(result.requiresException).toBe(true);
      expect(result.status).toBe("POOR_ACCURACY");
    });

    it("should flag exception when coordinates are missing (permission denied)", () => {
      const result = evaluateAttendanceGeofence({
        deviceLat: null,
        deviceLon: null,
        accuracyMeters: null,
        branchLat: STORE_LAT,
        branchLon: STORE_LON,
      });

      expect(result.requiresException).toBe(true);
      expect(result.status).toBe("LOCATION_MISSING");
    });
  });
});
