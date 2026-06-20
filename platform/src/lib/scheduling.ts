import { addDays, addMonths, setHours, setMinutes, startOfDay } from 'date-fns';
import type { OccurrenceStatus } from '@prisma/client';

export function generateOccurrences(
  startDate: Date,
  scheduleDays: number[],
  scheduleTime: string | null | undefined,
  count = 8,
): Date[] {
  const [hours, minutes] = (scheduleTime ?? '09:00').split(':').map(Number);
  const dates: Date[] = [];
  let cursor = startOfDay(startDate);

  while (dates.length < count) {
    if (scheduleDays.includes(cursor.getDay())) {
      const slot = setMinutes(setHours(cursor, hours), minutes);
      if (slot >= startDate) {
        dates.push(slot);
      }
    }
    cursor = addDays(cursor, 1);
    if (dates.length === 0 && cursor > addMonths(startDate, 3)) break;
    if (dates.length > 0 && cursor > addMonths(dates[dates.length - 1], 2)) break;
  }

  return dates;
}

export function calculatePlatformFee(amountCents: number, percent = 10): number {
  return Math.round(amountCents * (percent / 100));
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
  }).format(cents / 100);
}

export const OCCURRENCE_TRANSITIONS: Record<OccurrenceStatus, OccurrenceStatus[]> = {
  SCHEDULED: ['COMPLETED', 'SKIPPED', 'CANCELLED'],
  COMPLETED: ['DISPUTED'],
  SKIPPED: [],
  DISPUTED: [],
  CANCELLED: [],
};

export function canTransitionOccurrence(from: OccurrenceStatus, to: OccurrenceStatus): boolean {
  return OCCURRENCE_TRANSITIONS[from]?.includes(to) ?? false;
}

export function billingPeriodEnd(start: Date): Date {
  return addMonths(start, 1);
}
