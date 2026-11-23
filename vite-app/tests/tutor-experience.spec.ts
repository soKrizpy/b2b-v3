import { expect, test } from "@playwright/test";
import { getTutorMeetingStatusLabel } from "../src/TutorExperience";

test("maps production meeting completion values to tutor-facing labels", () => {
  const base = {
    id: 1,
    title: "Sesi Scratch",
    meeting_date: "2026-11-23T10:00:00.000Z",
    is_completed: false,
    completion_status: "scheduled"
  } as Parameters<typeof getTutorMeetingStatusLabel>[0];

  expect(getTutorMeetingStatusLabel({ ...base, completion_status: "selesai" })).toBe("Selesai");
  expect(getTutorMeetingStatusLabel({ ...base, completion_status: "terlewat" })).toBe("Tidak terlaksana");
  expect(getTutorMeetingStatusLabel({ ...base, completion_status: "cancelled" })).toBe("Dibatalkan");
  expect(getTutorMeetingStatusLabel({ ...base, completion_status: "soft_deleted" })).toBe("Dibatalkan");
  expect(getTutorMeetingStatusLabel({ ...base, is_completed: true })).toBe("Selesai");
  expect(getTutorMeetingStatusLabel(base)).toBe("Terjadwal");
});
