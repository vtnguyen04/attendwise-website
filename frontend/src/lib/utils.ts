import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import { NullableString, NullableBoolean, NullableFloat, NullableInt  } from '@/lib/types';
import { formatInTimeZone } from 'date-fns-tz';

export function getNullableStringValue(
  nullableString: NullableString | string | undefined | null,
  defaultValue: string = ''
): string {
  if (typeof nullableString === 'string') {
    return nullableString || defaultValue;
  }
  if (nullableString && nullableString.Valid) {
    return nullableString.String;
  }
  return defaultValue;
}

export function toNullableString(value: string | undefined | null): NullableString {
  return { String: value || "", Valid: !!value };
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function extractStringValue(nullableString: { String: string; Valid: boolean } | undefined | null): string | undefined {
  return nullableString?.Valid ? nullableString.String : undefined;
}

export function extractTimeValue(nullableTime: { Time: string; Valid: boolean } | undefined | null): string | undefined {
  return nullableTime?.Valid ? nullableTime.Time : undefined;
}

export function parseUtcTime(timeStr: string | undefined): Date | undefined {
  if (!timeStr) {
    return undefined;
  }

  // If the string already contains timezone information, parse it directly.
  if (timeStr.includes('Z') || timeStr.includes('+') || timeStr.includes('-')) {
    const date = new Date(timeStr);
    return isNaN(date.getTime()) ? undefined : date;
  }

  // If no timezone information, assume it's a local time string
  // and convert it to UTC for consistent comparisons.
  // This creates a Date object in local time, then converts it to its UTC equivalent.
  const localDate = new Date(timeStr);
  if (isNaN(localDate.getTime())) { // Check for invalid date
    return undefined;
  }
  return new Date(localDate.toISOString()); // Convert local date to UTC string and then to Date object
}

export function formatInTimezone(
  dateInput: Date | string | undefined | null,
  timezone: string,
  formatStr: string
): string {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return formatInTimeZone(date, timezone, formatStr);
}
/** 
 * Extracts the integer value from a Go backend NullableInt.
 * Returns the number if Valid is true, otherwise returns undefined.
 * `undefined` is often better for form default values than `null` or `0`.
 */
export const extractIntValue = (nullable: NullableInt | null | undefined): number | undefined => {
  if (nullable?.Valid) {
    return 'Int32' in nullable ? nullable.Int32 : nullable.Int64;
  }
  return undefined;
};

/**
 * Extracts the float value from a Go backend NullableFloat.
 * Returns the number if Valid is true, otherwise returns undefined.
 */
export const extractFloatValue = (nullable: NullableFloat | null | undefined): number | undefined => {
  return nullable?.Valid ? nullable.Float64 : undefined;
};

/**
 * Extracts the boolean value from a Go backend NullableBoolean.
 * Returns the boolean value if Valid is true, otherwise returns false as a safe default.
 */
export const extractBooleanValue = (nullable: NullableBoolean | null | undefined): boolean => {
  return nullable?.Valid ? nullable.Bool : false;
};


export const getAbsoluteUrl = (path: string | null | undefined): string => {
  if (!path) return '';
  if (path.startsWith('http')) {
    return path;
  }
  // Use NEXT_PUBLIC_ASSET_URL for a more generic name
  const baseUrl = process.env.NEXT_PUBLIC_ASSET_URL;
  return `${baseUrl}${path}`;
};

export const getSafeImageUrl = (urlSource: NullableString | string | null | undefined): string => {
  let path: string | null = null;

  if (typeof urlSource === 'string') {
    path = urlSource;
  } else if (urlSource && typeof urlSource === 'object' && 'Valid' in urlSource) {
    // This is a NullableString object
    path = urlSource.Valid ? urlSource.String : null;
  }
  
  // If we have a valid path, convert it to an absolute URL
  return path ? getAbsoluteUrl(path) : '';
};

export const getAccessToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('accessToken');
  }
  return null;
};
