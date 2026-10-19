/* Events and calendar. type: event | exam | ptm | holiday | recitation | activity.
   start / end are YYYY-MM-DD (end optional); time is optional "HH:MM".
   Every entry below is SAMPLE text; it makes no claim about the school's real calendar. */
window.UBK_EVENTS = [
  { id: "term-assembly", title: "Start of term assembly", start: "2026-09-14", time: "08:00", type: "event", location: null, sample: true,
    description: "A sample past event. Past events move to the Past events list." },
  { id: "recitation-day", title: "Qur'an recitation day", start: "2026-10-24", time: "09:00", type: "recitation", location: null, sample: true,
    description: "A sample event for pupils to recite before teachers and families." },
  { id: "mid-term", title: "Mid-term break", start: "2026-10-26", end: "2026-10-30", type: "holiday", location: null, sample: true,
    description: "A sample holiday period. Classes resume after the last day." },
  { id: "parent-meeting", title: "Parent-teacher meeting", start: "2026-11-07", time: "10:00", type: "ptm", location: null, sample: true,
    description: "A sample meeting for parents to discuss progress with class teachers." },
  { id: "sports-day", title: "Sports day", start: "2026-11-14", time: "09:30", type: "activity", location: null, sample: true,
    description: "A sample sports event with races, team games and prizes." },
  { id: "open-day", title: "Open day for new families", start: "2026-11-21", time: "10:00", type: "event", location: null, sample: true,
    description: "A sample open day for families who would like to visit the school." },
  { id: "term-exams", title: "End of term examinations", start: "2026-11-30", end: "2026-12-04", type: "exam", location: null, sample: true,
    description: "A sample examination week. The real timetable is published on the News page." }
];
