/**
 * Custom datetime column type that uses local timezone
 *
 * This ensures MySQL datetime values are stored and retrieved using
 * the local timezone (respects TZ environment variable and system timezone).
 */

import { customType } from 'drizzle-orm/mysql-core';

export const datetimeUtc = customType<{ data: Date; driverData: string }>({
  dataType() {
    return 'datetime';
  },
  toDriver(value: Date): string {
    // Convert Date to MySQL datetime string using local timezone
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    const hours = String(value.getHours()).padStart(2, '0');
    const minutes = String(value.getMinutes()).padStart(2, '0');
    const seconds = String(value.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  },
  fromDriver(value: string): Date {
    // When retrieving from MySQL, interpret as local timezone
    // MySQL returns '2023-07-21 14:30:00'
    // Create Date object treating it as local time
    return new Date(value.replace(' ', 'T'));
  }
});
