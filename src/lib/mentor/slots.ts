/**
 * 1-on-1 slots (B phase 3, migration 089): a mentor opens short slots, one
 * member books each, with what they want to talk about.
 *
 * Rules the owner approved (4 Oct 2026): 10 to 120 minutes; at most one
 * upcoming booking per member per group; a member cancels up to an hour
 * before, and the slot opens again; a mentor's cancel closes it.
 */

export type SlotStatus = "open" | "booked" | "cancelled";

export interface GroupSlot {
  id: string;
  groupId: string;
  startsAt: string;
  durationMinutes: number;
  place: string | null;
  status: SlotStatus;
  /** True when the caller booked it. */
  mine: boolean;
  /** Who booked it and why: the mentor sees these, a member only for their own. */
  bookedBy: string | null;
  topic: string | null;
}

export const SLOT_COLUMNS = "id, group_id, mentor_account_id, starts_at, duration_minutes, place, status, booked_by, booked_at, topic";
export const SLOT_DURATIONS = [15, 20, 30, 45, 60] as const;
export const SLOT_BATCH_MAX = 8;
/** A member cancels at least this long before the start. */
export const SLOT_CANCEL_LEAD_MS = 60 * 60_000;
