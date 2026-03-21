/**
 * Custom datetime column type that uses local timezone
 *
 * MySQL:  stored as DATETIME, serialized/deserialized with local tz.
 * SQLite: stored as TEXT in ISO 8601 format (YYYY-MM-DDTHH:mm:ss).
 *
 * The MySQL variant is the default export and is used in all existing
 * schema definitions (mysqlTable). A separate `datetimeUtcSqlite` is
 * exported for SQLite schema definitions.
 */

import { customType } from "drizzle-orm/mysql-core";
import { customType as customTypeSqlite } from "drizzle-orm/sqlite-core";

// ── Shared helpers ──────────────────────────────

function dateToLocalString(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  const seconds = String(value.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function dateToIsoString(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  const seconds = String(value.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

function stringToDate(value: string): Date {
  // Handles both "2023-07-21 14:30:00" and "2023-07-21T14:30:00"
  return new Date(value.replace(" ", "T"));
}

// ── MySQL variant (existing, unchanged behavior) ─

export const datetimeUtc = customType<{ data: Date; driverData: string }>({
  dataType() {
    return "datetime";
  },
  toDriver(value: Date): string {
    return dateToLocalString(value);
  },
  fromDriver(value: string): Date {
    return stringToDate(value);
  },
});

// ── SQLite variant ──────────────────────────────

export const datetimeUtcSqlite = customTypeSqlite<{
  data: Date;
  driverData: string;
}>({
  dataType() {
    return "text";
  },
  toDriver(value: Date): string {
    return dateToIsoString(value);
  },
  fromDriver(value: string): Date {
    return stringToDate(value);
  },
});
