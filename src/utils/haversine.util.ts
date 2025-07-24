/**
 * Utility functions for geographic calculations
 */

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface RoutePoint {
  latitude: number;
  longitude: number;
  sequenceOrder: number;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param coord1 First coordinate
 * @param coord2 Second coordinate
 * @returns Distance in meters
 */
export function calculateHaversineDistance(
  coord1: Coordinate,
  coord2: Coordinate,
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (coord1.latitude * Math.PI) / 180;
  const φ2 = (coord2.latitude * Math.PI) / 180;
  const Δφ = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const Δλ = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculate the distance from a point to a line segment
 * @param point The point to check
 * @param lineStart Start of the line segment
 * @param lineEnd End of the line segment
 * @returns Distance in meters
 */
export function distanceToLineSegment(
  point: Coordinate,
  lineStart: Coordinate,
  lineEnd: Coordinate,
): number {
  const A = point.latitude - lineStart.latitude;
  const B = point.longitude - lineStart.longitude;
  const C = lineEnd.latitude - lineStart.latitude;
  const D = lineEnd.longitude - lineStart.longitude;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) param = dot / lenSq;

  let xx, yy;

  if (param < 0) {
    xx = lineStart.latitude;
    yy = lineStart.longitude;
  } else if (param > 1) {
    xx = lineEnd.latitude;
    yy = lineEnd.longitude;
  } else {
    xx = lineStart.latitude + param * C;
    yy = lineStart.longitude + param * D;
  }

  const dx = point.latitude - xx;
  const dy = point.longitude - yy;

  return Math.sqrt(dx * dx + dy * dy) * 111000; // Convert to meters (roughly)
}

/**
 * Check if a point is within a certain distance of a route
 * @param point The GPS point to check
 * @param routePoints Array of route points in order
 * @param maxDistance Maximum allowed distance in meters (default: 500m)
 * @returns Object with isOnRoute and closestDistance
 */
export function checkRouteProximity(
  point: Coordinate,
  routePoints: RoutePoint[],
  maxDistance: number = 500,
): { isOnRoute: boolean; closestDistance: number; closestSegment: number } {
  if (routePoints.length < 2) {
    return { isOnRoute: false, closestDistance: Infinity, closestSegment: -1 };
  }

  let minDistance = Infinity;
  let closestSegment = -1;

  // Check distance to each line segment of the route
  for (let i = 0; i < routePoints.length - 1; i++) {
    const segmentStart = routePoints[i];
    const segmentEnd = routePoints[i + 1];

    const distance = distanceToLineSegment(point, segmentStart, segmentEnd);

    if (distance < minDistance) {
      minDistance = distance;
      closestSegment = i;
    }
  }

  return {
    isOnRoute: minDistance <= maxDistance,
    closestDistance: minDistance,
    closestSegment,
  };
}

/**
 * Calculate total route distance
 * @param routePoints Array of route points in order
 * @returns Total distance in meters
 */
export function calculateRouteDistance(routePoints: RoutePoint[]): number {
  if (routePoints.length < 2) return 0;

  let totalDistance = 0;

  for (let i = 0; i < routePoints.length - 1; i++) {
    const current = routePoints[i];
    const next = routePoints[i + 1];
    totalDistance += calculateHaversineDistance(current, next);
  }

  return totalDistance;
}
