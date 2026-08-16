export interface NigeriaSentinel {
  state: string;
  city: string;
  latitude: number;
  longitude: number;
}

// Capital/metro anchor for every state + FCT. Each anchor is expanded into a
// compact 5-point urban grid at runtime so a local cloudburst several kilometres
// away from the city centre is less likely to be missed by a single weather-model point.
export const NIGERIA_SENTINELS: NigeriaSentinel[] = [
  { state: "Abia", city: "Umuahia", latitude: 5.5249, longitude: 7.4946 },
  { state: "Adamawa", city: "Yola", latitude: 9.2035, longitude: 12.4954 },
  { state: "Akwa Ibom", city: "Uyo", latitude: 5.0389, longitude: 7.9098 },
  { state: "Anambra", city: "Awka", latitude: 6.2101, longitude: 7.0741 },
  { state: "Bauchi", city: "Bauchi", latitude: 10.3158, longitude: 9.8442 },
  { state: "Bayelsa", city: "Yenagoa", latitude: 4.9267, longitude: 6.2676 },
  { state: "Benue", city: "Makurdi", latitude: 7.7337, longitude: 8.5214 },
  { state: "Borno", city: "Maiduguri", latitude: 11.8469, longitude: 13.1571 },
  { state: "Cross River", city: "Calabar", latitude: 4.9517, longitude: 8.3220 },
  { state: "Delta", city: "Asaba", latitude: 6.1985, longitude: 6.7274 },
  { state: "Ebonyi", city: "Abakaliki", latitude: 6.3249, longitude: 8.1137 },
  { state: "Edo", city: "Benin City", latitude: 6.3350, longitude: 5.6037 },
  { state: "Ekiti", city: "Ado-Ekiti", latitude: 7.6233, longitude: 5.2209 },
  { state: "Enugu", city: "Enugu", latitude: 6.5244, longitude: 7.5100 },
  { state: "FCT", city: "Abuja", latitude: 9.0765, longitude: 7.3986 },
  { state: "Gombe", city: "Gombe", latitude: 10.2897, longitude: 11.1673 },
  { state: "Imo", city: "Owerri", latitude: 5.4891, longitude: 7.0176 },
  { state: "Jigawa", city: "Dutse", latitude: 11.7594, longitude: 9.3392 },
  { state: "Kaduna", city: "Kaduna", latitude: 10.5105, longitude: 7.4165 },
  { state: "Kano", city: "Kano", latitude: 12.0022, longitude: 8.5920 },
  { state: "Katsina", city: "Katsina", latitude: 12.9908, longitude: 7.6018 },
  { state: "Kebbi", city: "Birnin Kebbi", latitude: 12.4539, longitude: 4.1975 },
  { state: "Kogi", city: "Lokoja", latitude: 7.8023, longitude: 6.7333 },
  { state: "Kwara", city: "Ilorin", latitude: 8.4966, longitude: 4.5421 },
  { state: "Lagos", city: "Ikeja", latitude: 6.6018, longitude: 3.3515 },
  { state: "Nasarawa", city: "Lafia", latitude: 8.4966, longitude: 8.5153 },
  { state: "Niger", city: "Minna", latitude: 9.6139, longitude: 6.5569 },
  { state: "Ogun", city: "Abeokuta", latitude: 7.1475, longitude: 3.3619 },
  { state: "Ondo", city: "Akure", latitude: 7.2571, longitude: 5.2058 },
  { state: "Osun", city: "Osogbo", latitude: 7.7827, longitude: 4.5418 },
  { state: "Oyo", city: "Ibadan", latitude: 7.3775, longitude: 3.9470 },
  { state: "Plateau", city: "Jos", latitude: 9.8965, longitude: 8.8583 },
  { state: "Rivers", city: "Port Harcourt", latitude: 4.8156, longitude: 7.0498 },
  { state: "Sokoto", city: "Sokoto", latitude: 13.0059, longitude: 5.2476 },
  { state: "Taraba", city: "Jalingo", latitude: 8.8920, longitude: 11.3771 },
  { state: "Yobe", city: "Damaturu", latitude: 11.7470, longitude: 11.9608 },
  { state: "Zamfara", city: "Gusau", latitude: 12.1704, longitude: 6.6641 },
];

export interface ExpandedNigeriaSentinel extends NigeriaSentinel {
  id: string;
  pointLabel: string;
  anchorCity: string;
}

export function expandNigeriaSentinels(radiusKm = 9): ExpandedNigeriaSentinel[] {
  const latitudeDelta = radiusKm / 111;
  return NIGERIA_SENTINELS.flatMap((anchor) => {
    const longitudeDelta = radiusKm / (111 * Math.max(0.25, Math.cos(anchor.latitude * Math.PI / 180)));
    const points = [
      { suffix: "C", label: "centre", lat: anchor.latitude, lon: anchor.longitude },
      { suffix: "N", label: "north", lat: anchor.latitude + latitudeDelta, lon: anchor.longitude },
      { suffix: "S", label: "south", lat: anchor.latitude - latitudeDelta, lon: anchor.longitude },
      { suffix: "E", label: "east", lat: anchor.latitude, lon: anchor.longitude + longitudeDelta },
      { suffix: "W", label: "west", lat: anchor.latitude, lon: anchor.longitude - longitudeDelta },
    ];
    return points.map((point) => ({
      ...anchor,
      id: `${anchor.state}-${point.suffix}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      pointLabel: point.label,
      anchorCity: anchor.city,
      latitude: Number(point.lat.toFixed(5)),
      longitude: Number(point.lon.toFixed(5)),
    }));
  });
}
