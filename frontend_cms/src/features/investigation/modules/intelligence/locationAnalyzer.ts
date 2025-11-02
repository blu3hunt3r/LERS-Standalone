/**
 * TASK 6.2.1: Location Intelligence Module - Address standardization and clustering
 */

export class LocationAnalyzer {
  static standardizeAddress(addresses: string[]): string[] {
    return addresses.map(addr => {
      let standardized = addr.trim().toLowerCase();
      
      // Remove extra spaces
      standardized = standardized.replace(/\s+/g, ' ');
      
      // Standardize abbreviations
      standardized = standardized
        .replace(/\bst\b/g, 'street')
        .replace(/\brd\b/g, 'road')
        .replace(/\bave\b/g, 'avenue')
        .replace(/\bapt\b/g, 'apartment');
      
      return standardized;
    });
  }

  static clusterAddresses(addresses: { address: string; lat: number; lng: number }[]): {
    clusters: { centroid: { lat: number; lng: number }; addresses: string[]; radius: number }[];
  } {
    // Simple clustering by proximity
    const clusters: any[] = [];
    const processed = new Set<number>();

    for (let i = 0; i < addresses.length; i++) {
      if (processed.has(i)) continue;

      const cluster = {
        centroid: { lat: addresses[i].lat, lng: addresses[i].lng },
        addresses: [addresses[i].address],
        radius: 0,
      };

      for (let j = i + 1; j < addresses.length; j++) {
        if (processed.has(j)) continue;

        const distance = this.haversineDistance(
          addresses[i].lat,
          addresses[i].lng,
          addresses[j].lat,
          addresses[j].lng
        );

        if (distance < 1000) { // 1km clustering
          cluster.addresses.push(addresses[j].address);
          processed.add(j);
        }
      }

      clusters.push(cluster);
      processed.add(i);
    }

    return { clusters };
  }

  private static haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371e3;
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

