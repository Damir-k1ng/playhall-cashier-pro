// PlayStation club "SVOY" constants

export const CLUB_NAME = 'PlayStation club "SVOY"';

export const CONTROLLER_RATE = 600; // ₸ per hour

export const PACKAGE_DURATION_HOURS = 3;
export const PACKAGE_WARNING_MINUTES = 5;

// Fallback stations if database fails
export const FALLBACK_STATIONS = [
  { id: '1', name: 'VIP 1', zone: 'vip', station_number: 1, hourly_rate: 3000, package_rate: 6000 },
  { id: '2', name: 'VIP 2', zone: 'vip', station_number: 2, hourly_rate: 3000, package_rate: 6000 },
  { id: '3', name: 'VIP 3', zone: 'vip', station_number: 3, hourly_rate: 2500, package_rate: 5500 },
  { id: '4', name: 'VIP 4', zone: 'vip', station_number: 4, hourly_rate: 2500, package_rate: 5000 },
  { id: '5', name: 'Зал 5', zone: 'hall', station_number: 5, hourly_rate: 1500, package_rate: 3000 },
  { id: '6', name: 'Зал 6', zone: 'hall', station_number: 6, hourly_rate: 1500, package_rate: 3000 },
  { id: '7', name: 'Зал 7', zone: 'hall', station_number: 7, hourly_rate: 1500, package_rate: 3000 },
  { id: '8', name: 'Зал 8', zone: 'hall', station_number: 8, hourly_rate: 1500, package_rate: 3000 },
] as const;

export const FALLBACK_DRINKS = [
  { id: '1', name: 'Coca-Cola 1L', price: 900 },
  { id: '2', name: 'Вода 1L', price: 700 },
  { id: '3', name: 'Gorilla', price: 700 },
  { id: '4', name: 'Zigi-Zagi', price: 600 },
  { id: '5', name: 'Fuse Tea', price: 600 },
] as const;