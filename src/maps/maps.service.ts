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
    this.logger.log(`Google Maps API Key loaded: ${apiKey ? 'YES' : 'NO'}`);
    if (apiKey) {
      this.logger.log(`API Key starts with: ${apiKey.substring(0, 10)}...`);
    }
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
      this.logger.log(
        `Calling Google Maps API with origin: ${origin}, destination: ${destination}, waypoints: [${waypoints?.join(' | ') || 'none'}]`,
      );

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

      this.logger.log(
        `Google Maps API Response Status: ${response.data.status}`,
      );
      this.logger.log(
        `Google Maps API Response Routes Count: ${response.data.routes?.length || 0}`,
      );

      if (response.data.status !== 'OK') {
        this.logger.error(
          `Google Maps API Error: ${response.data.status} - ${response.data.error_message || 'No error message'}`,
        );
        throw new Error(
          `Google Maps API Error: ${response.data.status} - ${response.data.error_message || 'No error message'}`,
        );
      }

      if (!response.data.routes || response.data.routes.length === 0) {
        this.logger.error('Google Maps API returned no routes');
        throw new Error('Google Maps API returned no routes');
      }

      const route = response.data.routes[0];
      this.logger.log(`Route has ${route.legs?.length || 0} legs`);
      this.logger.log(
        `Route polyline exists: ${!!route.overview_polyline?.points}`,
      );
      this.logger.log(
        `Route polyline length: ${route.overview_polyline?.points?.length || 0}`,
      );

      if (!route.overview_polyline?.points) {
        this.logger.error('Route has no polyline data');
        throw new Error('Route has no polyline data');
      }

      const polyline = route.overview_polyline.points;

      // Decode the polyline to get all coordinates
      const decodedPath = decodePolyline(polyline);
      this.logger.log(`Decoded polyline has ${decodedPath.length} points`);

      // Calculate total distance and duration across all legs
      let totalDistance = 0;
      let totalDuration = 0;
      const allRouteSteps: Array<{
        instruction: string;
        distance: string;
        duration: string;
        startLocation: { lat: number; lng: number };
        endLocation: { lat: number; lng: number };
      }> = [];

      // Process all legs (segments between waypoints)
      if (!route.legs || route.legs.length === 0) {
        this.logger.error('Route has no legs data');
        throw new Error('Route has no legs data');
      }

      route.legs.forEach((leg, legIndex) => {
        this.logger.log(
          `Processing leg ${legIndex + 1}: ${leg.distance?.text || 'N/A'}, ${leg.duration?.text || 'N/A'}`,
        );

        if (!leg.distance || !leg.duration) {
          this.logger.error(
            `Leg ${legIndex + 1} is missing distance or duration data`,
          );
          throw new Error(
            `Leg ${legIndex + 1} is missing distance or duration data`,
          );
        }

        totalDistance += leg.distance.value;
        totalDuration += leg.duration.value;

        // Add all steps from this leg
        if (leg.steps && leg.steps.length > 0) {
          leg.steps.forEach((step) => {
            allRouteSteps.push({
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
            });
          });
        } else {
          this.logger.warn(`Leg ${legIndex + 1} has no steps`);
        }
      });

      // Format distance and duration text
      const formatDistance = (meters: number): string => {
        if (meters >= 1000) {
          return `${(meters / 1000).toFixed(1)} km`;
        }
        return `${meters} m`;
      };

      const formatDuration = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (hours > 0) {
          return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} min${minutes > 1 ? 's' : ''}`;
        }
        return `${minutes} min${minutes > 1 ? 's' : ''}`;
      };

      this.logger.log(
        `Total route: ${formatDistance(totalDistance)}, ${formatDuration(totalDuration)}`,
      );
      this.logger.log(`Total route steps: ${allRouteSteps.length}`);
      this.logger.log(`Total waypoints: ${waypoints?.length || 0}`);

      return {
        routePolyline: polyline,
        decodedPath,
        estimatedDistance: totalDistance, // in meters
        estimatedDistanceText: formatDistance(totalDistance),
        estimatedDuration: totalDuration, // in seconds
        estimatedDurationText: formatDuration(totalDuration),
        routeSteps: allRouteSteps,
        waypoints: waypoints || [],
      };
    } catch (error) {
      this.logger.error(`Error calculating complete route: ${error.message}`);
      this.logger.error(`Error stack: ${error.stack}`);
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

    // Log the original points for debugging
    this.logger.log(
      `Original route points: ${JSON.stringify(
        routePoints.map((p) => ({
          lat: p.latitude,
          lng: p.longitude,
          type: p.type,
          sequenceOrder: p.sequenceOrder,
        })),
      )}`,
    );

    // Sort points by sequenceOrder if available, otherwise by their order in the array
    const sortedPoints = [...routePoints].sort((a, b) => {
      if (a.sequenceOrder !== undefined && b.sequenceOrder !== undefined) {
        return a.sequenceOrder - b.sequenceOrder;
      }
      return 0;
    });

    // Log sorted points for debugging
    this.logger.log(
      `Sorted route points: ${JSON.stringify(
        sortedPoints.map((p) => ({
          lat: p.latitude,
          lng: p.longitude,
          type: p.type,
          sequenceOrder: p.sequenceOrder,
        })),
      )}`,
    );

    // Check if all points have sequenceOrder
    const hasSequenceOrder = sortedPoints.every(
      (p) => p.sequenceOrder !== undefined,
    );

    if (hasSequenceOrder) {
      // Validate unique sequenceOrder (but don't require consecutive)
      const sequenceOrders = sortedPoints.map((p) => p.sequenceOrder);
      const uniqueOrders = new Set(sequenceOrders);

      if (uniqueOrders.size !== sortedPoints.length) {
        this.logger.warn(
          `Duplicate sequenceOrder values found: [${sequenceOrders.join(', ')}]. Using sorted order.`,
        );
        // If there are duplicates, sort by the order they appear in the original array
        const originalIndices = new Map();
        routePoints.forEach((point, index) => {
          originalIndices.set(`${point.latitude},${point.longitude}`, index);
        });

        sortedPoints.sort((a, b) => {
          const indexA = originalIndices.get(`${a.latitude},${a.longitude}`);
          const indexB = originalIndices.get(`${b.latitude},${b.longitude}`);
          return indexA - indexB;
        });
      }
    }

    // Use the first point as origin and last point as destination
    const origin = sortedPoints[0];
    const destination = sortedPoints[sortedPoints.length - 1];

    // All points in between become waypoints (excluding first and last)
    const waypoints = sortedPoints
      .slice(1, -1) // Remove first and last points
      .map((p) => `${p.latitude},${p.longitude}`);

    // Debug log
    this.logger.log(
      `Google Maps Route Calculation: origin=${origin.latitude},${origin.longitude} destination=${destination.latitude},${destination.longitude} waypoints=[${waypoints.join(' | ')}] (total points: ${sortedPoints.length})`,
    );

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
