import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num);
}

function isValidDate(date: Date): boolean {
  return !Number.isNaN(date.getTime());
}

export function parseDateOnly(date: Date | string): Date {
  if (date instanceof Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  const value = date.trim();
  const dateOnlyMatch = value.match(/^(\d{4}-\d{2}-\d{2})/);
  const parsed = dateOnlyMatch
    ? new Date(`${dateOnlyMatch[1]}T00:00:00`)
    : new Date(value);

  return parsed;
}

function parseDateTimeValue(date: Date | string): Date {
  if (date instanceof Date) {
    return date;
  }

  const value = date.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value);
}

export function toDateOnlyString(date: Date | string): string {
  const parsed = parseDateOnly(date);
  if (!isValidDate(parsed)) return "";

  const year = parsed.getFullYear().toString().padStart(4, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function formatDate(date: Date | string): string {
  const d = parseDateOnly(date);
  if (!isValidDate(d)) return "Data invalida";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function formatDateLong(date: Date | string): string {
  const d = parseDateOnly(date);
  if (!isValidDate(d)) return "Data invalida";

  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(date: Date | string): string {
  const d = parseDateTimeValue(date);
  if (!isValidDate(d)) return "Data invalida";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function isOverdue(date: Date | string, status: string): boolean {
  const d = parseDateOnly(date);
  if (!isValidDate(d)) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today && status !== "COMPLETED" && status !== "CANCELLED";
}

export function decimalToNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  return parseFloat(String(value));
}

export function getMonthName(month: number): string {
  return new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(
    new Date(2024, month - 1, 1)
  );
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function toDateString(date: Date): string {
  return toDateOnlyString(date);
}
