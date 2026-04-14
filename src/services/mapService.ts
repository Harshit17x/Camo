
import { getApiUrl } from './api';

export const mapService = {
  /**
   * Search for places using Proxy API
   */
  async autosuggest(query: string): Promise<any[]> {
    if (!query || query.length < 3) return [];
    
    try {
      const response = await fetch(getApiUrl(`/api/map/autosuggest?query=${encodeURIComponent(query)}`));
      const data = await response.json();
      
      if (!response.ok) throw new Error('Autosuggest failed');
      
      return data.suggestedLocations || [];
    } catch (error) {
      console.error(`Map Autosuggest Error:`, error);
      return [];
    }
  },

  /**
   * Get Route using Proxy API
   */
  async getRoute(start: { lat: number, lng: number }, end: { lat: number, lng: number }) {
    const startCoord = `${start.lng},${start.lat}`;
    const endCoord = `${end.lng},${end.lat}`;
    
    try {
      const response = await fetch(getApiUrl(`/api/map/route?start=${startCoord}&end=${endCoord}`));
      
      // Handle non-JSON responses
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.warn(`Non-JSON response from routing API: ${text}`);
        throw new Error(text || 'Invalid JSON response');
      }

      const data = await response.json();
      
      if (response.ok && data.routes && data.routes[0]) {
        const route = data.routes[0];
        return {
          coordinates: route.geometry.coordinates.map((coord: [number, number]) => ({
            lat: coord[1],
            lng: coord[0]
          })),
          distance: route.distance,
          duration: route.duration,
          steps: (route.legs?.[0]?.steps || []).map((step: any) => ({
            instruction: `${step.maneuver?.type || ''} ${step.maneuver?.modifier || ''} on ${step.name || 'unnamed road'}`.trim(),
            distance: step.distance,
            duration: step.duration
          }))
        };
      } else {
        console.warn('Proxy Routing returned no routes or error:', data.error || response.statusText);
      }
    } catch (error) {
      console.warn(`Proxy Routing failed:`, error);
    }
    
    console.warn('Proxy Routing failed, using mock route as fallback');
    return this.getMockRoute(start, end);
  },

  /**
   * Get Nearest point on road using Proxy API
   */
  async getNearest(point: { lat: number, lng: number }) {
    // For nearest, we can use the route API with same start/end or just return point for now
    // OSRM nearest isn't proxied yet, but we can use the point directly as fallback
    return point;
  },

  /**
   * Get Distance and Duration using Proxy API
   */
  async getDistanceMatrix(origin: { lat: number, lng: number }, destination: { lat: number, lng: number }) {
    const startCoord = `${origin.lng},${origin.lat}`;
    const endCoord = `${destination.lng},${destination.lat}`;
    
    try {
      const response = await fetch(getApiUrl(`/api/map/distance_matrix?start=${startCoord}&end=${endCoord}`));
      const data = await response.json();
      
      if (response.ok && data.distances && data.distances[0] && data.distances[0][1] !== null) {
        return {
          distance: data.distances[0][1],
          duration: data.durations[0][1]
        };
      }
    } catch (error) {
      console.warn(`Proxy Table failed:`, error);
    }
    
    return this.getMockDistance(origin, destination);
  },

  /**
   * Map Matching service
   */
  async matchRoute(points: Array<{ lat: number, lng: number }>) {
    // Fallback to original points if matching is not proxied
    return {
      coordinates: points,
      distance: 0,
      duration: 0
    };
  },

  /**
   * Get ETA in minutes
   */
  async getETA(driverLoc: { lat: number, lng: number }, pickupLoc: { lat: number, lng: number }): Promise<number> {
    const matrix = await this.getDistanceMatrix(driverLoc, pickupLoc);
    return Math.round(matrix.duration / 60) || 5;
  },

  /**
   * Reverse Geocode using Proxy API with retry logic
   */
  async reverseGeocode(lat: number, lng: number, retries = 2, lang: string = 'en'): Promise<string> {
    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
      console.warn("Invalid coordinates for reverse geocoding:", { lat, lng });
      return 'Unknown Location';
    }

    const attemptFetch = async (currentRetry: number): Promise<string> => {
      try {
        const response = await fetch(getApiUrl(`/api/map/reverse?lat=${lat}&lon=${lng}&lang=${lang}`));
        
        // Handle non-JSON responses (like "Rate exceeded.")
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await response.text();
          console.warn(`Non-JSON response from reverse geocode: ${text}`);
          if (text.includes("Rate exceeded")) {
            return 'Location (Rate Limited)';
          }
          throw new Error(`Non-JSON response: ${text}`);
        }

        const data = await response.json();
        
        if (!response.ok) {
          console.warn('Proxy reverse geocode failed:', data.error || response.statusText);
          return data.display_name || 'Unknown Location';
        }
        
        // Extract a clean address
        const address = data.display_name || 'Unknown Location';
        return address;
      } catch (error) {
        console.error(`Map Reverse Geocode Error (Attempt ${3 - currentRetry}):`, error);
        
        if (currentRetry > 0) {
          console.log(`Retrying reverse geocode in 1s... (${currentRetry} retries left)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          return attemptFetch(currentRetry - 1);
        }
        
        return 'Unknown Location';
      }
    };

    return attemptFetch(retries);
  },

  // Mock Helpers
  getMockDistance(origin: { lat: number, lng: number }, destination: { lat: number, lng: number }) {
    const dist = Math.sqrt(Math.pow(origin.lat - destination.lat, 2) + Math.pow(origin.lng - destination.lng, 2)) * 111000;
    return {
      distance: dist,
      duration: dist / 10
    };
  },

  getMockRoute(start: { lat: number, lng: number }, end: { lat: number, lng: number }) {
    const steps = 10;
    const coordinates = [];
    for (let i = 0; i <= steps; i++) {
      coordinates.push({
        lat: start.lat + (end.lat - start.lat) * (i / steps),
        lng: start.lng + (end.lng - start.lng) * (i / steps)
      });
    }
    const dist = this.getMockDistance(start, end).distance;
    return {
      coordinates,
      distance: dist,
      duration: dist / 10,
      steps: [
        { instruction: 'Head towards destination', distance: dist / 2, duration: dist / 20 },
        { instruction: 'Continue straight', distance: dist / 2, duration: dist / 20 }
      ]
    };
  }
};
