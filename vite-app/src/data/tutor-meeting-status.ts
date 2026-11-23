import type { TutorMeetingSummary } from "./supabase-tutor-schedule-repository";

export function getTutorMeetingStatusLabel(meeting: TutorMeetingSummary) {
  if (meeting.is_completed || ["completed", "held", "selesai"].includes(meeting.completion_status ?? "")) return "Selesai";
  if (["cancelled", "soft_deleted"].includes(meeting.completion_status ?? "")) return "Dibatalkan";
  if (["not_held", "terlewat"].includes(meeting.completion_status ?? "")) return "Tidak terlaksana";
  return "Terjadwal";
}
