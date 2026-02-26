import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format currency in Kazakhstani Tenge
export function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('ru-RU')} ₸`;
}

// Format time duration from minutes as HH:MM or Xч Xм
export function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.floor(totalMinutes % 60);
  
  if (hours > 0) {
    return `${hours}ч ${minutes}м`;
  }
  return `${minutes}м`;
}

// Format time duration as HH:MM:SS (for large display timers)
export function formatDurationHMS(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Get elapsed time in seconds from a start timestamp
export function getElapsedSeconds(startedAt: string): number {
  const start = new Date(startedAt);
  const now = new Date();
  return Math.floor((now.getTime() - start.getTime()) / 1000);
}

// Fixed timezone for Kazakhstan (Astana UTC+5)
const TIMEZONE = 'Asia/Almaty';

// Format time as HH:MM (fixed to Astana timezone)
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('ru-RU', { 
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: TIMEZONE 
  });
}

// Format time from ISO string as HH:MM (fixed to Astana timezone)
export function formatTimeFromISO(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('ru-RU', { 
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: TIMEZONE 
  });
}

// Calculate package end time and format as "С HH:MM до HH:MM"
export function formatPackageTimeRange(startedAt: string, packageCount: number = 1): string {
  const startDate = new Date(startedAt);
  const endDate = new Date(startDate.getTime() + (packageCount * 180 * 60 * 1000)); // 180 min per package
  
  const startTime = startDate.toLocaleTimeString('ru-RU', { 
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: TIMEZONE 
  });
  
  const endTime = endDate.toLocaleTimeString('ru-RU', { 
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: TIMEZONE 
  });
  
  return `С ${startTime} до ${endTime}`;
}

// Format date as DD.MM.YYYY (fixed to Astana timezone)
export function formatDate(date: Date): string {
  return date.toLocaleDateString('ru-RU', { timeZone: TIMEZONE });
}

// Format date and time (fixed to Astana timezone)
export function formatDateTime(date: Date): string {
  return `${formatDate(date)} ${formatTime(date)}`;
}

// Format date as "25 декабря (четверг)"
export function formatDateFull(date: Date): string {
  const months = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
  ];
  const weekdays = [
    'воскресенье', 'понедельник', 'вторник', 'среда',
    'четверг', 'пятница', 'суббота'
  ];
  
  const day = date.getDate();
  const month = months[date.getMonth()];
  const weekday = weekdays[date.getDay()];
  
  return `${day} ${month} (${weekday})`;
}

// Calculate elapsed time in minutes from a start timestamp
export function getElapsedMinutes(startedAt: string): number {
  const start = new Date(startedAt);
  const now = new Date();
  return Math.floor((now.getTime() - start.getTime()) / 60000);
}

// Calculate remaining package time in minutes (3 hours per package)
export function getPackageRemainingMinutes(startedAt: string, packageCount: number = 1): number {
  const totalPackageMinutes = 180 * packageCount; // 3 hours per package
  const elapsed = getElapsedMinutes(startedAt);
  return Math.max(0, totalPackageMinutes - elapsed);
}

// Calculate game cost based on tariff and duration
export function calculateGameCost(
  hourlyRate: number,
  packageRate: number,
  tariffType: 'hourly' | 'package',
  elapsedMinutes: number,
  packageCount: number = 1
): number {
  if (tariffType === 'package') {
    // Package: fixed price per package (3 hours each), then per-minute rate after
    const totalPackageMinutes = 180 * packageCount; // 3 hours per package
    const baseCost = packageRate * packageCount;
    
    if (elapsedMinutes <= totalPackageMinutes) {
      return baseCost;
    } else {
      // Overtime: per-minute rate (hourly / 60) for exact time beyond all packages
      const extraMinutes = elapsedMinutes - totalPackageMinutes;
      const minuteRate = hourlyRate / 60;
      const extraCost = Math.round(extraMinutes * minuteRate);
      return baseCost + extraCost;
    }
  } else {
    // Hourly: pro-rated
    return Math.ceil((elapsedMinutes / 60) * hourlyRate);
  }
}

// Break down game cost into package (fixed) and overtime (discountable) parts
export function calculateGameCostBreakdown(
  hourlyRate: number,
  packageRate: number,
  tariffType: 'hourly' | 'package',
  elapsedMinutes: number,
  packageCount: number = 1
): { packageCost: number; overtimeCost: number; totalGameCost: number } {
  if (tariffType === 'package') {
    const totalPackageMinutes = 180 * packageCount;
    const baseCost = packageRate * packageCount;
    
    if (elapsedMinutes <= totalPackageMinutes) {
      return { packageCost: baseCost, overtimeCost: 0, totalGameCost: baseCost };
    } else {
      const extraMinutes = elapsedMinutes - totalPackageMinutes;
      const minuteRate = hourlyRate / 60;
      const extraCost = Math.round(extraMinutes * minuteRate);
      return { packageCost: baseCost, overtimeCost: extraCost, totalGameCost: baseCost + extraCost };
    }
  } else {
    const cost = Math.ceil((elapsedMinutes / 60) * hourlyRate);
    return { packageCost: 0, overtimeCost: cost, totalGameCost: cost };
  }
}

// Calculate controller cost (600 ₸/hour, pro-rated)
export function calculateControllerCost(usageMinutes: number): number {
  const CONTROLLER_RATE = 600;
  return Math.ceil((usageMinutes / 60) * CONTROLLER_RATE);
}

// Generate time slots for reservations (5-minute increments)
export function generateTimeSlots(startHour: number = 10, endHour: number = 4): string[] {
  const slots: string[] = [];
  
  // From startHour to midnight
  for (let hour = startHour; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 5) {
      slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    }
  }
  
  // From midnight to endHour
  for (let hour = 0; hour <= endHour; hour++) {
    for (let minute = 0; minute < 60; minute += 5) {
      if (hour === endHour && minute > 0) break;
      slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    }
  }
  
  return slots;
}