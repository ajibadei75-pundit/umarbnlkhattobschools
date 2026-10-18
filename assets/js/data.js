/* Content data shared by the home page, News, Events, About, Academics, Contact and Search.
   Everything marked sample:true is placeholder content for layout preview. In Section 4 this file is replaced
   by database tables managed from the admin dashboard. Dates are relative to today so the preview never goes stale. */
(function () {
  function day(n) { var d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n); return d; }
  function iso(d) { var m = d.getMonth() + 1, x = d.getDate(); return d.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (x < 10 ? "0" : "") + x; }
  function S(o) { o.sample = true; return o; }

  window.UBK_DATA = {
    news: [
      S({ id: "welcome", cat: "general", pinned: true, date: iso(day(-1)), title: "Welcome to the school website",
        excerpt: "News, events and information for parents, pupils and visitors, in one place.",
        body: ["This website brings school news, events and information together in one place.", "Parents and guardians can follow announcements here and, once the parent portal opens, sign in to see their children's updates.", "Please check back regularly for new notices."] }),
      S({ id: "exam-notice", cat: "exam", date: iso(day(-2)), title: "Examination timetable notice",
        excerpt: "Pupils and parents are reminded to check the confirmed examination dates.",
        body: ["The examination timetable will be shared by the school before examinations begin.", "Parents are advised to make sure pupils arrive on time and with the materials they need.", "Further details will be posted on this page and in the events calendar."] }),
      S({ id: "holiday", cat: "holiday", date: iso(day(-3)), title: "Public holiday: school closed",
        excerpt: "The school will be closed for the public holiday. Lessons resume on the next school day.",
        body: ["The school will be closed on the public holiday shown in the events calendar.", "Lessons resume on the next school day. Thank you for your understanding."] }),
      S({ id: "recitation", cat: "activity", date: iso(day(-4)), title: "Qur'an recitation programme",
        excerpt: "Details of the recitation programme will be announced by the school.",
        body: ["Pupils will take part in a Qur'an recitation programme.", "The date, time and arrangements will be announced by the school. See the events calendar for updates."] }),
      S({ id: "sports", cat: "activity", date: iso(day(-6)), title: "Sports and fitness activities",
        excerpt: "Sports activities continue as part of school life. Watch this page for schedules.",
        body: ["Sports and fitness activities help pupils build health, teamwork and confidence.", "Schedules and any kit requirements will be posted here by the school."] }),
      S({ id: "ptm", cat: "notice", date: iso(day(-7)), title: "Parent-teacher meeting reminder",
        excerpt: "A reminder about the upcoming parent-teacher meeting. See the events calendar for the date.",
        body: ["Parents and guardians are reminded about the upcoming parent-teacher meeting.", "The date and time are shown in the events calendar."] }),
      S({ id: "effort", cat: "achievement", date: iso(day(-9)), title: "Celebrating pupils' effort",
        excerpt: "We celebrate pupils who show good effort, good manners and steady progress.",
        body: ["Good effort, good manners and steady progress deserve to be celebrated.", "The school will share pupil recognitions here."] }),
      S({ id: "old-term", cat: "notice", date: iso(day(-70)), archived: true, title: "Notice from a previous term",
        excerpt: "An older notice kept in the archive.",
        body: ["This older notice has been archived. Archived items stay available but are hidden by default."] }),
      S({ id: "scheduled", cat: "notice", date: iso(day(3)), publishAt: iso(day(3)), title: "Scheduled notice (not yet visible)",
        excerpt: "This item appears automatically on its publication date.", body: ["Scheduled items stay hidden until their publication date."] })
    ],
    events: [
      S({ id: "ptm-meeting", cat: "meeting", start: iso(day(7)), time: "10:00", endTime: "12:00", title: "Parent-teacher meeting", location: "School premises",
        description: "A meeting for parents and guardians to speak with class teachers about pupils' progress." }),
      S({ id: "sports-day", cat: "activity", start: iso(day(10)), time: "09:00", endTime: "13:00", title: "Sports activities day", location: "School premises",
        description: "Games and fitness activities for pupils." }),
      S({ id: "exam-week", cat: "exam", start: iso(day(12)), end: iso(day(16)), time: "08:00", title: "Examination week", location: "School premises",
        description: "Term examinations. The timetable will be shared by the school." }),
      S({ id: "recitation-day", cat: "recitation", start: iso(day(20)), time: "09:00", endTime: "11:30", title: "Qur'an recitation programme", location: "School premises",
        description: "Pupils present Qur'an recitation. Arrangements will be announced by the school." }),
      S({ id: "holiday-day", cat: "holiday", start: iso(day(30)), title: "Public holiday (school closed)", location: "",
        description: "The school is closed. Lessons resume on the next school day." }),
      S({ id: "end-term", cat: "general", start: iso(day(44)), time: "08:00", endTime: "12:00", title: "End of term", location: "School premises",
        description: "Closing activities for the term." }),
      S({ id: "assembly-past", cat: "general", start: iso(day(-5)), time: "08:00", title: "Term review meeting", location: "School premises",
        description: "A past event kept to show how earlier events appear." })
    ],
    faqs: [
      { id: "portal", q: "How do I get a parent portal account?", a: "Parent accounts are created by the school after your child's details are verified. Once the portal opens, the school will tell you how to sign in." },
      { id: "payments", q: "Can I pay school fees on this website?", a: "No. Fees are paid to the school directly, outside this website. In the parent portal you will be able to upload a receipt as evidence and send a written payment approval request. Uploading a receipt does not mean the payment is verified; the school reviews each submission." },
      { id: "apply", q: "How do I apply for admission?", a: "Use the Admissions page: read the requirements, fill in the online application and upload your documents. You will receive a reference number and a tracking code to follow your application. You can also contact the school office." },
      { id: "languages", q: "Which languages does the website support?", a: "English, Arabic (right to left) and Hausa. Use the language menu in the top bar. The Arabic and Hausa wording is being reviewed." },
      { id: "reports", q: "Will I see my child's reports here?", a: "Approved reports can be shown in the parent portal if the school enables them. Each parent sees only their own children." },
      { id: "privacy", q: "How is my information used?", a: "Details sent through the contact form are used only to reply to you. Children's records and receipts will be visible only to authorised staff and the linked parent." },
      { id: "night", q: "How do I switch to night mode?", a: "Use the sun, moon and monitor switch in the top bar to choose Light, Night or System mode. Your choice is remembered on this device." }
    ],
    about: {
      vision: "To nurture confident, knowledgeable and well-mannered children whose learning is guided by faith.",
      mission: "To provide quality nursery and primary education in a caring environment, with Qur'anic and Arabic studies at the heart of school life.",
      philosophy: "Every child can learn. We aim to build strong foundations in reading, numbers and character, taught patiently and with encouragement.",
      quranic: "Qur'anic recitation and the Arabic language are taught as part of daily learning, with attention to correct pronunciation, understanding and good conduct.",
      values: [
        { icon: "moon", t: "Faith", d: "Learning that is guided by faith and gratitude to Allah." },
        { icon: "book", t: "Knowledge", d: "A love of learning in the Qur'an, Arabic, English and every subject." },
        { icon: "star", t: "Good character", d: "Honesty, kindness and good manners in everything we do." },
        { icon: "family", t: "Respect", d: "Respect for parents, teachers, classmates and the school community." },
        { icon: "shield", t: "Responsibility", d: "Pupils learn to take care of their work, their belongings and each other." },
        { icon: "heart", t: "Care", d: "A warm, safe environment where every child is seen and encouraged." }
      ]
    },
    programmes: {
      nursery: {
        desc: "Early years learning through play, songs, stories and simple routines, building language, number sense and good habits.",
        approach: "Children learn by doing: short activities, repetition, songs and gentle encouragement, with Arabic letters and short Qur'anic recitation introduced step by step.",
        subjects: [
          { n: "Letter sounds and early reading", g: "core" }, { n: "Counting and early numbers", g: "core" }, { n: "Everyday science and nature", g: "core" },
          { n: "Qur'an recitation (short surahs)", g: "qa" }, { n: "Arabic letters and sounds", g: "qa" }, { n: "Duas and daily remembrance", g: "qa" },
          { n: "Creative play and drawing", g: "creative" }, { n: "Songs and movement", g: "creative" }
        ]
      },
      primary: {
        desc: "A structured primary programme that builds reading, writing and number skills alongside Qur'anic and Arabic studies.",
        approach: "Clear lessons, regular practice and steady feedback. Pupils recite, read and write in both English and Arabic, and are encouraged to ask questions.",
        subjects: [
          { n: "English language", g: "core" }, { n: "Mathematics", g: "core" }, { n: "Basic science", g: "core" }, { n: "Social studies", g: "core" },
          { n: "Qur'an recitation and tajweed", g: "qa" }, { n: "Qur'an memorisation", g: "qa" }, { n: "Arabic language", g: "qa" }, { n: "Islamic studies", g: "qa" },
          { n: "Creative arts", g: "creative" }, { n: "Physical and health education", g: "creative" }
        ]
      },
      secondary: {
        desc: "A secondary programme that deepens English, mathematics and science while continuing Qur'anic, Arabic and Islamic studies.",
        approach: "Subject teaching with regular assessment, guided study habits and continued Qur'an and Arabic study, preparing students for the next stage of their education.",
        subjects: [
          { n: "English language", g: "core" }, { n: "Mathematics", g: "core" }, { n: "Basic science and technology", g: "core" }, { n: "Social studies", g: "core" }, { n: "Computer studies", g: "core" },
          { n: "Qur'an recitation and tajweed", g: "qa" }, { n: "Qur'an memorisation", g: "qa" }, { n: "Arabic language", g: "qa" }, { n: "Islamic studies", g: "qa" },
          { n: "Creative arts", g: "creative" }, { n: "Physical and health education", g: "creative" }
        ]
      }
    },
    gallery: ["morning", "quran", "sports", "arabic", "nursery", "evening"]
  };
})();
