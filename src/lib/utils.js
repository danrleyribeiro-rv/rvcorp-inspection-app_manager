import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { GOOGLE_MAPS_API_KEY } from './config';

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function getGoogleMapsImageUrl(address) {
  if (!address || !GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'SUA_CHAVE_API_AQUI') {
    return '/globe.svg'; // Retorna um placeholder se não houver endereço ou chave
  }

  const formattedAddress = [
    address.street,
    address.number,
    address.neighborhood,
    address.city,
    address.state,
  ].filter(Boolean).join(', ');

  if (!formattedAddress) return '/globe.svg';

  const url = new URL('https://maps.googleapis.com/maps/api/staticmap');
  url.searchParams.append('center', formattedAddress);
  url.searchParams.append('zoom', '16');
  url.searchParams.append('size', '400x300');
  url.searchParams.append('maptype', 'roadmap');
  url.searchParams.append('markers', `color:red|${formattedAddress}`);
  url.searchParams.append('key', GOOGLE_MAPS_API_KEY);

  return url.toString();
}
