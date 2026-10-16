import { describe, it, expect } from "vitest";
import {
  calculateHaversineDistanceMeters,
  evaluateAttendanceGeofence,
} from "../../src/lib/geofence";

describe("Geofence & Attendance Unit Tests", () => {
  // Indiranagar store coordinates: 12.9784 N, 77.6408 E
  const STORE_LAT = 12.9784;
  const STORE_LON = 77.6408;

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

  describe("evaluateAttendanceGeofence", () => {
    it("should mark punch inside geofence when distance <= 150m and accuracy is good", () => {
      const result = evaluateAttendanceGeofence({
        deviceLat: STORE_LAT + 0.0002,
        deviceLon: STORE_LON + 0.0002,
        accuracyMeters: 15.0,
        branchLat: STORE_LAT,
        branchLon: STORE_LON,
        geofenceRadiusMeters: 150.0,
      });

      expect(result.isWithinGeofence).toBe(true);
      expect(result.requiresException).toBe(false);
      expect(result.status).toBe("VERIFIED");
    });

    it("should flag exception when device is outside geofence boundary", () => {
      // 0.007 deg away (~750m)
      const result = evaluateAttendanceGeofence({
        deviceLat: STORE_LAT + 0.007,
        deviceLon: STORE_LON + 0.007,
        accuracyMeters: 18.0,
        branchLat: STORE_LAT,
        branchLon: STORE_LON,
        geofenceRadiusMeters: 150.0,
      });

      expect(result.isWithinGeofence).toBe(false);
      expect(result.requiresException).toBe(true);
      expect(result.status).toBe("OUTSIDE_GEOFENCE");
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
