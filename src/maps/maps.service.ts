import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Client,
  DistanceMatrixResponse,
  DirectionsResponse,
  TravelMode,
} from '@googlemaps/google-maps-services-js';

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
}
