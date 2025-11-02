/**
 * TASK 5.1.3: Location Triangulation - Multi-source location consensus
 */

export interface LocationSource {
  source: 'cdr' | 'delivery' | 'ip' | 'social';
  lat: number;
  lng: number;
  accuracy: number; // in meters
  timestamp?: string;
}

export class LocationTriangulator {
  static triangulate(locations: LocationSource[]): {
    lat: number;
    lng: number;
    confidence: number;
    radius: number;
    sources: string[];
  } {
    if (locations.length === 0) {
      return { lat: 0, lng: 0, confidence: 0, radius: 0, sources: [] };
    }

    if (locations.length === 1) {
      return {
        lat: locations[0].lat,
        lng: locations[0].lng,
        confidence: 0.5,
        radius: locations[0].accuracy,
        sources: [locations[0].source],
      };
    }

    // Calculate weighted centroid
    let totalWeight = 0;
    let weightedLat = 0;
    let weightedLng = 0;

    for (const loc of locations) {
      const weight = 1 / Math.max(loc.accuracy, 1);
      totalWeight += weight;
      weightedLat += loc.lat * weight;
      weightedLng += loc.lng * weight;
    }

    const centroidLat = weightedLat / totalWeight;
    const centroidLng = weightedLng / totalWeight;

    // Calculate maximum distance from centroid
    const distances = locations.map(loc =>
      this.haversineDistance(centroidLat, centroidLng, loc.lat, loc.lng)
    );

    const maxRadius = Math.max(...distances);
    const avgRadius = distances.reduce((sum, d) => sum + d, 0) / distances.length;

    // Confidence based on clustering
    const confidence = Math.max(0, Math.min(1, 1 - (avgRadius / 5000))); // 5km threshold

    return {
      lat: centroidLat,
      lng: centroidLng,
      confidence,
      radius: maxRadius,
      sources: locations.map(l => l.source),
    };
  }

  private static haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}

