// PlayStation club "SVOY" constants

export const APP_VERSION = 'v1.0.0';

export const CLUB_NAME = 'PlayStation club SVOY';

export const CONTROLLER_RATE = 600; // ₸ per hour

export const PACKAGE_DURATION_HOURS = 3;
export const PACKAGE_DURATION_MINUTES = 180;
export const PACKAGE_WARNING_MINUTES = 5;

// Station configuration (reference only - actual data from database)
export const STATIONS = [
  { name: 'VIP 1', zone: 'vip', station_number: 1, hourly_rate: 3000, package_rate: 6000 },
  { name: 'VIP 2', zone: 'vip', station_number: 2, hourly_rate: 3000, package_rate: 6000 },
  { name: 'VIP 3', zone: 'vip', station_number: 3, hourly_rate: 2500, package_rate: 5500 },
  { name: 'VIP 4', zone: 'vip', station_number: 4, hourly_rate: 2500, package_rate: 5000 },
  { name: 'Зал 5', zone: 'hall', station_number: 5, hourly_rate: 1500, package_rate: 3000 },
  { name: 'Зал 6', zone: 'hall', station_number: 6, hourly_rate: 1500, package_rate: 3000 },
  { name: 'Зал 7', zone: 'hall', station_number: 7, hourly_rate: 1500, package_rate: 3000 },
  { name: 'Зал 8', zone: 'hall', station_number: 8, hourly_rate: 1500, package_rate: 3000 },
] as const;
