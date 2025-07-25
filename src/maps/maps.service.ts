import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Client,
  DistanceMatrixResponse,
  DirectionsResponse,
  TravelMode,
} from '@googlemaps/google-maps-services-js';

// Polyline decoder utility
function decodePolyline(encoded: string): Array<{ lat: number; lng: number }> {
  const poly: Array<{ lat: number; lng: number }> = [];
  let index = 0;
  let len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let shift = 0;
    let result = 0;

    do {
      let b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (result >= 0x20);

    let dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      let b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (result >= 0x20);

    let dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    poly.push({
      lat: lat / 1e5,
      lng: lng / 1e5,
    });
  }

  return poly;
}

@Injectable()
export class MapsService {
  private readonly client: Client;
  private readonly logger = new Logger(MapsService.name);

  constructor(private configService: ConfigService) {
    this.client = new Client({});
  }

  private getApiKey(): string {
    const apiKey = this.configService.get<string>('googleMaps.apiKey');
    if (!apiKey) {
      throw new Error('Google Maps API key is not configured');
    }
    return apiKey;
  }

  async calculateDistance(
    origin: string,
    destination: string,
  ): Promise<{
    distance: string;
    duration: string;
    status: string;
  }> {
    try {
      const response = await this.client.distancematrix({
        params: {
          origins: [origin],
          destinations: [destination],
          mode: TravelMode.driving,
          key: this.getApiKey(),
        },
      });

      const result = response.data.rows[0].elements[0];
      return {
        distance: result.distance.text,
        duration: result.duration.text,
        status: result.status,
      };
    } catch (error) {
      this.logger.error(`Error calculating distance: ${error.message}`);
      throw error;
    }
  }

  async getDirections(
    origin: string,
    destination: string,
    waypoints?: string[],
  ) {
    try {
      const response = await this.client.directions({
        params: {
          origin,
          destination,
          waypoints,
          mode: TravelMode.driving,
          optimize: true,
          key: this.getApiKey(),
        },
      });

      return {
        route: response.data.routes[0],
        status: response.data.status,
      };
    } catch (error) {
      this.logger.error(`Error getting directions: ${error.message}`);
      throw error;
    }
  }

  async geocode(address: string) {
    try {
      const response = await this.client.geocode({
        params: {
          address,
          key: this.getApiKey(),
        },
      });

      return response.data.results[0];
    } catch (error) {
      this.logger.error(`Error geocoding address: ${error.message}`);
      throw error;
    }
  }

  async calculateCompleteRoute(
    origin: string,
    destination: string,
    waypoints?: string[],
  ): Promise<{
    routePolyline: string;
    decodedPath: Array<{ lat: number; lng: number }>;
    estimatedDistance: number;
    estimatedDistanceText: string;
    estimatedDuration: number;
    estimatedDurationText: string;
    routeSteps: Array<{
      instruction: string;
      distance: string;
      duration: string;
      startLocation: { lat: number; lng: number };
      endLocation: { lat: number; lng: number };
    }>;
    waypoints: string[];
  }> {
    try {
      const response = await this.client.directions({
        params: {
          origin,
          destination,
          waypoints,
          mode: TravelMode.driving,
          optimize: false, // Don't optimize - respect the order we provide
          key: this.getApiKey(),
        },
      });

      if (response.data.status !== 'OK' || !response.data.routes.length) {
        throw new Error(`No route found: ${response.data.status}`);
      }

      const route = response.data.routes[0];
      const leg = route.legs[0];
      const polyline = route.overview_polyline.points;

      // Decode the polyline to get all coordinates
      const decodedPath = decodePolyline(polyline);

      // Extract route steps (turn-by-turn directions)
      const routeSteps = leg.steps.map((step) => ({
        instruction: step.html_instructions || 'Continue',
        distance: step.distance.text,
        duration: step.duration.text,
        startLocation: {
          lat: step.start_location.lat,
          lng: step.start_location.lng,
        },
        endLocation: {
          lat: step.end_location.lat,
          lng: step.end_location.lng,
        },
      }));

      return {
        routePolyline: polyline,
        decodedPath,
        estimatedDistance: leg.distance.value, // in meters
        estimatedDistanceText: leg.distance.text,
        estimatedDuration: leg.duration.value, // in seconds
        estimatedDurationText: leg.duration.text,
        routeSteps,
        waypoints: waypoints || [],
      };
    } catch (error) {
      this.logger.error(`Error calculating complete route: ${error.message}`);
      throw error;
    }
  }

  async calculateRouteFromPoints(
    routePoints: Array<{
      latitude: number;
      longitude: number;
      type: string;
      sequenceOrder?: number;
    }>,
  ): Promise<{
    routePolyline: string;
    decodedPath: Array<{ lat: number; lng: number }>;
    estimatedDistance: number;
    estimatedDistanceText: string;
    estimatedDuration: number;
    estimatedDurationText: string;
    routeSteps: Array<{
      instruction: string;
      distance: string;
      duration: string;
      startLocation: { lat: number; lng: number };
      endLocation: { lat: number; lng: number };
    }>;
    waypoints: string[];
  }> {
    if (routePoints.length < 2) {
      throw new Error('Route must have at least 2 points');
    }

    // Sort points by sequenceOrder if available, otherwise by their order in the array
    const sortedPoints = [...routePoints].sort((a, b) => {
      if (a.sequenceOrder !== undefined && b.sequenceOrder !== undefined) {
        return a.sequenceOrder - b.sequenceOrder;
      }
      return 0;
    });

    // Use the first point as origin and last point as destination
    const origin = sortedPoints[0];
    const destination = sortedPoints[sortedPoints.length - 1];

    // All points in between become waypoints (excluding first and last)
    const waypoints = sortedPoints
      .slice(1, -1) // Remove first and last points
      .map((p) => `${p.latitude},${p.longitude}`);

    const originStr = `${origin.latitude},${origin.longitude}`;
    const destinationStr = `${destination.latitude},${destination.longitude}`;

    // Google Maps has a limit of 23 waypoints, so we need to handle this
    if (waypoints.length > 23) {
      this.logger.warn(
        `Route has ${waypoints.length} waypoints, but Google Maps only supports 23. Using first 23 waypoints.`,
      );
      waypoints.splice(23); // Keep only first 23 waypoints
    }

    this.logger.log(
      `Calculating route with ${waypoints.length + 2} total points (${waypoints.length} waypoints)`,
    );

    return this.calculateCompleteRoute(originStr, destinationStr, waypoints);
  }
}
