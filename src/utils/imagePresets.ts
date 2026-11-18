import type { BikeCategory } from '../types/bike';

export interface ImagePreset {
  id: string;
  label: string;
  category: BikeCategory;
  url: string;
}

export const HERO_IMAGE_URL = '/src/assets/images/hero_minimalist_cycling_1795025971279.jpg';

export const BIKE_IMAGE_PRESETS: ImagePreset[] = [
  {
    id: 'urban-matte',
    label: 'Urbana Grafite (Estúdio)',
    category: 'Urbana',
    url: '/src/assets/images/bike_urban_matte_1795025971122.jpg',
  },
  {
    id: 'electric-city',
    label: 'Elétrica Pérola (Estúdio)',
    category: 'Elétrica',
    url: '/src/assets/images/bike_electric_city_1795025971955.jpg',
  },
  {
    id: 'gravel-sand',
    label: 'Gravel Oliva (Estúdio)',
    category: 'Gravel',
    url: '/src/assets/images/bike_gravel_sand_1795025972849.jpg',
  },
  {
    id: 'road-carbon',
    label: 'Estrada Carbono (Estúdio)',
    category: 'Estrada',
    url: '/src/assets/images/bike_road_carbon_1795025972364.jpg',
  },
];

export function defaultImageForCategory(category: BikeCategory): string {
  const match = BIKE_IMAGE_PRESETS.find((preset) => preset.category === category);
  return match ? match.url : BIKE_IMAGE_PRESETS[0].url;
}
