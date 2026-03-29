export type EventPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type EventStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface AgendaCategory {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  createdAt: Date;
}

export interface AgendaEvent {
  id: string;
  title: string;
  description: string | null;
  date: Date;
  startTime: string | null;
  endTime: string | null;
  allDay: boolean;
  priority: EventPriority;
  status: EventStatus;
  categoryId: string | null;
  category: AgendaCategory | null;
  transactionId: string | null;
  recurrenceRule: string | null;
  recurrenceEnd: Date | null;
  parentEventId: string | null;
  reminderMinutes: number | null;
  isFreelancer: boolean;
  freelanceAmount: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEventInput {
  title: string;
  description?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  allDay?: boolean;
  priority?: EventPriority;
  status?: EventStatus;
  categoryId?: string;
  recurrenceRule?: string;
  recurrenceEnd?: string;
  reminderMinutes?: number;
  isFreelancer?: boolean;
  freelanceAmount?: string | null;
}

export interface UpdateEventInput extends Partial<CreateEventInput> {
  completedAt?: string | null;
}

export interface EventFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: EventStatus;
  priority?: EventPriority;
  categoryId?: string;
  search?: string;
}
