export type Position = [number, number];
export type RouteStop = { latitude: number; longitude: number; transportation?: string };

export function distanceKm(a: RouteStop, b: RouteStop) {
  const rad = Math.PI / 180;
  const h = Math.sin((b.latitude - a.latitude) * rad / 2) ** 2 +
    Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin((b.longitude - a.longitude) * rad / 2) ** 2;
  return 12742 * Math.atan2(Math.sqrt(Math.min(1, h)), Math.sqrt(Math.max(0, 1 - h)));
}

export function routingProfile(mode = "car") {
  return ({ car: "driving-car", bicycle: "cycling-regular", walking: "foot-walking" } as Record<string, string>)[mode];
}

// Split at the date line so direct connections do not cross the entire world map.
export function directLines(positions: Position[]): Position[][] {
  const lines: Position[][] = [];
  let line: Position[] = [];
  for (const input of positions) {
    const point: Position = [input[0], ((input[1] + 180) % 360 + 360) % 360 - 180];
    const prev = line[line.length - 1];
    if (prev && Math.abs(point[1] - prev[1]) > 180) {
      const endLng = point[1] + (point[1] > prev[1] ? -360 : 360);
      const edge = endLng > prev[1] ? 180 : -180;
      const lat = prev[0] + (point[0] - prev[0]) * (edge - prev[1]) / (endLng - prev[1]);
      line.push([lat, edge]);
      lines.push(line);
      line = [[lat, -edge]];
    }
    line.push(point);
  }
  if (line.length) lines.push(line);
  return lines;
}

export function routeKey(journeyId: string, a: RouteStop, b: RouteStop) {
  return [journeyId, a.latitude, a.longitude, b.latitude, b.longitude, b.transportation || "car"].join(":");
}
