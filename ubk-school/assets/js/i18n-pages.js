/* Interface strings for the public pages. Arabic and Hausa are DRAFTS that need review by fluent speakers
   before launch. Page content (news, events, FAQ, About text) lives in data.js and is edited by the school. */
(function () {
  var add = function (l, o) { Object.keys(o).forEach(function (k) { window.UBK_I18N[l][k] = o[k]; }); };

  add("en", {
    "pg.about": "About the School", "pg.about.d": "Vision, values, approach, staff and gallery",
    "pg.academics": "Academics", "pg.academics.d": "Nursery, primary and secondary programmes and subjects",
    "pg.admissions": "Admissions", "pg.admissions.d": "Apply online and track your application",
    "pg.news": "News & Announcements", "pg.news.d": "Notices, exams, holidays and achievements",
    "pg.events": "Events & Calendar", "pg.events.d": "School calendar in calendar and list views",
    "pg.contact": "Contact & Support", "pg.contact.d": "Reach the school, FAQ and enquiries",
    "tag.soon": "Soon", "status.built": "Live", "status.open": "Open page",
    "search.open": "Search", "search.ph": "Search pages, news, events, FAQ", "search.hint": "Type to search. Use the arrow keys, then Enter.",
    "search.empty": "No results found.", "search.g.pages": "Pages", "search.g.news": "News", "search.g.events": "Events", "search.g.faq": "Questions",
    "crumb.home": "Home", "crumb.label": "Breadcrumb", "onpage": "On this page",
    "sample.badge": "Sample", "sample.note": "Sample content is shown to preview the layout. The school's administrators will replace it from the dashboard.",
    "draft.badge": "Draft", "draft.note": "Draft wording, pending approval by the school.",
    "view.all": "View all", "read.more": "Read more", "close": "Close", "print": "Print", "copy.link": "Copy link", "copied": "Copied",
    "prev": "Previous", "next": "Next", "today": "Today", "loadmore": "Show more", "showing": "Showing {n} of {m}", "next.up": "Continue exploring",
    "upd.t": "Latest news and events", "upd.d": "What is happening at the school.", "news.latest": "Latest news", "ev.upcoming": "Upcoming events",
    "upd.none.news": "No announcements yet.", "upd.none.events": "No upcoming events.",
    "cat.notice": "Notice", "cat.exam": "Exams", "cat.holiday": "Holiday", "cat.achievement": "Achievement", "cat.activity": "Activity",
    "cat.general": "General", "cat.meeting": "Meeting", "cat.recitation": "Recitation",

    "about.lead": "A school community built on knowledge, faith and good character.",
    "about.tab.story": "Our school", "about.tab.vm": "Vision & mission", "about.tab.values": "Values", "about.tab.approach": "Our approach",
    "about.tab.staff": "Staff", "about.tab.facilities": "Facilities", "about.tab.gallery": "School life",
    "about.glance": "At a glance", "about.g.levels": "Levels", "about.g.levels.v": "Nursery and Primary", "about.g.focus": "Focus", "about.g.focus.v": "Qur'anic and Arabic studies",
    "about.g.langs": "Website languages", "about.g.langs.v": "English, Arabic, Hausa", "about.g.motto": "Motto",
    "about.vision": "Vision", "about.mission": "Mission", "about.values": "Our values", "about.philosophy": "Educational philosophy", "about.quranic": "Qur'anic and Arabic studies",
    "about.staff": "Staff profiles", "about.staff.empty": "Approved staff profiles will appear here once the school provides them.",
    "about.facilities": "Facilities", "about.facilities.empty": "Facilities will be listed here once the school confirms them.",
    "about.gallery": "School life", "gal.note": "Illustrations are shown until the school provides approved photographs.",

    "acad.lead": "Nursery, primary and secondary education with Qur'anic and Arabic studies at the centre.",
    "acad.level": "Programme level", "acad.subjects": "Subjects", "acad.classes": "Classes", "acad.classes.empty": "The school will confirm the class list for this level.",
    "acad.approach": "Teaching approach", "acad.resources": "Learning resources",
    "acad.resources.d": "Approved videos, games, worksheets and quizzes will be available in the Learning Centre.", "acad.go.resources": "Go to Learning Resources",
    "sub.qa": "Qur'an & Arabic", "sub.core": "Core subjects", "sub.creative": "Creative & physical", "sub.count": "{n} subjects",

    "news.lead": "Notices, exams, holidays, achievements and activities.", "news.search": "Search news", "news.archived": "Show archived",
    "news.pinned": "Pinned", "news.empty": "No news matches your search.", "news.cats": "Categories", "post.published": "Published", "news.archived.tag": "Archived",

    "ev.lead": "School events, exams, meetings, holidays and recitation programmes.", "ev.view.cal": "Calendar", "ev.view.list": "List",
    "ev.past": "Show past events", "ev.print": "Print calendar", "ev.ics": "Download calendar (.ics)", "ev.add": "Add to my calendar",
    "ev.when": "When", "ev.where": "Where", "ev.none": "No events to show.", "ev.more": "+{n} more", "ev.allday": "All day", "ev.on": "Events on {d}",
    "ev.views": "View", "ev.cats": "Event categories", "ev.cal.of": "Calendar for {m}",

    "con.lead": "We are happy to help. Send a message or visit the school.",
    "con.info": "School details", "con.address": "Address", "con.phone": "Phone", "con.email": "Email", "con.whatsapp": "WhatsApp", "con.hours": "Office hours", "con.map": "Directions",
    "con.tbc": "To be confirmed by the school", "con.open.map": "Open map", "con.chat": "Chat on WhatsApp",
    "form.t": "Send us a message", "form.unset": "Heads up: the school has not set up WhatsApp or email yet, so messages cannot be delivered from this form.",
    "f.name": "Your name", "f.phone": "Phone or WhatsApp (optional)", "f.email": "Email (optional)", "f.subject": "Subject", "f.subject.choose": "Choose a subject",
    "f.s.admissions": "Admissions enquiry", "f.s.general": "General enquiry", "f.s.portal": "Parent portal help", "f.s.feedback": "Feedback", "f.s.other": "Other",
    "f.message": "Message", "f.consent": "I agree that the school may use these details to reply to me.", "f.via": "Send using",
    "f.send": "Send message", "f.send.wa": "Send via WhatsApp", "f.send.mail": "Send via email", "f.copy": "Copy message", "f.count": "{n} / 1000", "f.required": "Required",
    "e.name": "Please enter your name.", "e.contact": "Please give a phone number or an email so the school can reply.", "e.email": "Please enter a valid email address.",
    "e.phone": "Please enter a valid phone number.", "e.subject": "Please choose a subject.", "e.message": "Please write at least 10 characters.",
    "e.consent": "Please tick the box to continue.", "e.slow": "Please review your message and try again in a moment.", "e.rate": "Too many messages from this device. Please try again later.",
    "e.fix": "Please fix the highlighted fields.",
    "r.none": "Not sent. The school has not set up WhatsApp or email yet, so your message was not delivered. You can copy it and send it another way.",
    "r.wa": "WhatsApp is opening with your message. Press Send there to deliver it.", "r.mail": "Your email app is opening with your message. Press Send there to deliver it.",
    "faq.t": "Frequently asked questions", "faq.search": "Search questions", "faq.none": "No questions match.",
    "visit.t": "Admissions and visits", "visit.d": "Apply online, track your application, or contact the school office to ask about admission.",
    "visit.cta": "Message the school"
  });

  add("ar", {
    "pg.about": "عن المدرسة", "pg.about.d": "الرؤية والقيم والمنهج والكادر والمعرض",
    "pg.academics": "البرامج الأكاديمية", "pg.academics.d": "برامج ومواد الحضانة والابتدائي والثانوي",
    "pg.admissions": "القبول", "pg.admissions.d": "قدّم طلبك عبر الإنترنت وتابعه",
    "pg.news": "الأخبار والإعلانات", "pg.news.d": "إشعارات واختبارات وعطلات وإنجازات",
    "pg.events": "الفعاليات والتقويم", "pg.events.d": "التقويم المدرسي بعرض شهري وقائمة",
    "pg.contact": "التواصل والدعم", "pg.contact.d": "تواصل مع المدرسة والأسئلة الشائعة",
    "tag.soon": "قريبًا", "status.built": "متاح", "status.open": "افتح الصفحة",
    "search.open": "بحث", "search.ph": "ابحث في الصفحات والأخبار والفعاليات", "search.hint": "اكتب للبحث. استخدم الأسهم ثم Enter.",
    "search.empty": "لا توجد نتائج.", "search.g.pages": "الصفحات", "search.g.news": "الأخبار", "search.g.events": "الفعاليات", "search.g.faq": "الأسئلة",
    "crumb.home": "الرئيسية", "crumb.label": "مسار التنقل", "onpage": "في هذه الصفحة",
    "sample.badge": "نموذج", "sample.note": "المحتوى المعروض نموذجي لمعاينة التصميم. ستستبدله إدارة المدرسة من لوحة التحكم.",
    "draft.badge": "مسودة", "draft.note": "نص مسودة بانتظار موافقة المدرسة.",
    "view.all": "عرض الكل", "read.more": "اقرأ المزيد", "close": "إغلاق", "print": "طباعة", "copy.link": "نسخ الرابط", "copied": "تم النسخ",
    "prev": "السابق", "next": "التالي", "today": "اليوم", "loadmore": "عرض المزيد", "showing": "عرض {n} من {m}", "next.up": "تابع الاستكشاف",
    "upd.t": "آخر الأخبار والفعاليات", "upd.d": "ما يجري في المدرسة.", "news.latest": "آخر الأخبار", "ev.upcoming": "الفعاليات القادمة",
    "upd.none.news": "لا توجد إعلانات بعد.", "upd.none.events": "لا توجد فعاليات قادمة.",
    "cat.notice": "إشعار", "cat.exam": "اختبارات", "cat.holiday": "عطلة", "cat.achievement": "إنجاز", "cat.activity": "نشاط",
    "cat.general": "عام", "cat.meeting": "اجتماع", "cat.recitation": "تلاوة",

    "about.lead": "مجتمع مدرسي قائم على العلم والإيمان وحسن الخلق.",
    "about.tab.story": "مدرستنا", "about.tab.vm": "الرؤية والرسالة", "about.tab.values": "القيم", "about.tab.approach": "منهجنا",
    "about.tab.staff": "الكادر", "about.tab.facilities": "المرافق", "about.tab.gallery": "الحياة المدرسية",
    "about.glance": "نظرة سريعة", "about.g.levels": "المراحل", "about.g.levels.v": "الحضانة والابتدائي", "about.g.focus": "التركيز", "about.g.focus.v": "الدراسات القرآنية والعربية",
    "about.g.langs": "لغات الموقع", "about.g.langs.v": "الإنجليزية والعربية والهوسا", "about.g.motto": "الشعار",
    "about.vision": "الرؤية", "about.mission": "الرسالة", "about.values": "قيمنا", "about.philosophy": "الفلسفة التربوية", "about.quranic": "الدراسات القرآنية والعربية",
    "about.staff": "ملفات الكادر", "about.staff.empty": "ستظهر ملفات الكادر المعتمدة هنا عندما تقدمها المدرسة.",
    "about.facilities": "المرافق", "about.facilities.empty": "ستُدرج المرافق هنا عندما تؤكدها المدرسة.",
    "about.gallery": "الحياة المدرسية", "gal.note": "تُعرض رسوم توضيحية حتى توفر المدرسة صورًا معتمدة.",

    "acad.lead": "تعليم الحضانة والابتدائي والثانوي مع الدراسات القرآنية والعربية في صميمه.",
    "acad.level": "مستوى البرنامج", "acad.subjects": "المواد", "acad.classes": "الفصول", "acad.classes.empty": "ستؤكد المدرسة قائمة الفصول لهذا المستوى.",
    "acad.approach": "أسلوب التدريس", "acad.resources": "الموارد التعليمية",
    "acad.resources.d": "ستتوفر فيديوهات وألعاب وأوراق عمل واختبارات معتمدة في مركز التعلم.", "acad.go.resources": "اذهب إلى المواد التعليمية",
    "sub.qa": "القرآن والعربية", "sub.core": "المواد الأساسية", "sub.creative": "الإبداع والبدني", "sub.count": "{n} مواد",

    "news.lead": "إشعارات واختبارات وعطلات وإنجازات وأنشطة.", "news.search": "ابحث في الأخبار", "news.archived": "عرض المؤرشف",
    "news.pinned": "مثبّت", "news.empty": "لا توجد أخبار مطابقة.", "news.cats": "التصنيفات", "post.published": "نُشر في", "news.archived.tag": "مؤرشف",

    "ev.lead": "فعاليات المدرسة والاختبارات والاجتماعات والعطلات وبرامج التلاوة.", "ev.view.cal": "تقويم", "ev.view.list": "قائمة",
    "ev.past": "عرض الفعاليات السابقة", "ev.print": "طباعة التقويم", "ev.ics": "تنزيل التقويم (.ics)", "ev.add": "أضف إلى تقويمي",
    "ev.when": "الموعد", "ev.where": "المكان", "ev.none": "لا توجد فعاليات.", "ev.more": "+{n} أخرى", "ev.allday": "طوال اليوم", "ev.on": "فعاليات {d}",
    "ev.views": "العرض", "ev.cats": "تصنيفات الفعاليات", "ev.cal.of": "تقويم {m}",

    "con.lead": "يسعدنا مساعدتك. أرسل رسالة أو زر المدرسة.",
    "con.info": "بيانات المدرسة", "con.address": "العنوان", "con.phone": "الهاتف", "con.email": "البريد", "con.whatsapp": "واتساب", "con.hours": "ساعات العمل", "con.map": "الاتجاهات",
    "con.tbc": "ستؤكدها المدرسة", "con.open.map": "افتح الخريطة", "con.chat": "تحدث عبر واتساب",
    "form.t": "أرسل لنا رسالة", "form.unset": "تنبيه: لم تُعدّ المدرسة واتساب أو البريد بعد، لذلك لا يمكن تسليم الرسائل من هذا النموذج.",
    "f.name": "اسمك", "f.phone": "الهاتف أو واتساب (اختياري)", "f.email": "البريد الإلكتروني (اختياري)", "f.subject": "الموضوع", "f.subject.choose": "اختر موضوعًا",
    "f.s.admissions": "استفسار عن القبول", "f.s.general": "استفسار عام", "f.s.portal": "مساعدة بوابة أولياء الأمور", "f.s.feedback": "ملاحظات", "f.s.other": "أخرى",
    "f.message": "الرسالة", "f.consent": "أوافق على أن تستخدم المدرسة هذه البيانات للرد عليّ.", "f.via": "الإرسال عبر",
    "f.send": "إرسال الرسالة", "f.send.wa": "إرسال عبر واتساب", "f.send.mail": "إرسال عبر البريد", "f.copy": "نسخ الرسالة", "f.count": "{n} / 1000", "f.required": "مطلوب",
    "e.name": "يرجى إدخال اسمك.", "e.contact": "يرجى إدخال رقم هاتف أو بريد لتتمكن المدرسة من الرد.", "e.email": "يرجى إدخال بريد إلكتروني صحيح.",
    "e.phone": "يرجى إدخال رقم هاتف صحيح.", "e.subject": "يرجى اختيار موضوع.", "e.message": "يرجى كتابة 10 أحرف على الأقل.",
    "e.consent": "يرجى تحديد المربع للمتابعة.", "e.slow": "يرجى مراجعة رسالتك والمحاولة بعد لحظات.", "e.rate": "رسائل كثيرة من هذا الجهاز. حاول لاحقًا.",
    "e.fix": "يرجى تصحيح الحقول المحددة.",
    "r.none": "لم تُرسل. لم تُعدّ المدرسة واتساب أو البريد بعد، لذلك لم تصل رسالتك. يمكنك نسخها وإرسالها بطريقة أخرى.",
    "r.wa": "يُفتح واتساب برسالتك. اضغط إرسال هناك لتسليمها.", "r.mail": "يُفتح تطبيق البريد برسالتك. اضغط إرسال هناك لتسليمها.",
    "faq.t": "الأسئلة الشائعة", "faq.search": "ابحث في الأسئلة", "faq.none": "لا توجد أسئلة مطابقة.",
    "visit.t": "القبول والزيارات", "visit.d": "قدّم عبر الإنترنت وتابع طلبك، أو تواصل مع مكتب المدرسة للاستفسار عن القبول.",
    "visit.cta": "راسل المدرسة"
  });

  add("ha", {
    "pg.about": "Game da Makaranta", "pg.about.d": "Hangen nesa, dabi'u, tsari, ma'aikata da hotuna",
    "pg.academics": "Karatu da Shirye-shirye", "pg.academics.d": "Shirye-shiryen nursery, firamare da sakandare da darussa",
    "pg.admissions": "Shiga Makaranta", "pg.admissions.d": "Nema shiga ta intanet kuma ka bibiya",
    "pg.news": "Labarai da Sanarwa", "pg.news.d": "Sanarwa, jarrabawa, hutu da nasarori",
    "pg.events": "Taruka da Kalanda", "pg.events.d": "Kalandar makaranta a kalanda da jeri",
    "pg.contact": "Tuntuɓa da Taimako", "pg.contact.d": "Tuntuɓi makaranta, tambayoyi da bincike",
    "tag.soon": "Nan gaba", "status.built": "Yana aiki", "status.open": "Buɗe shafi",
    "search.open": "Bincike", "search.ph": "Bincika shafuka, labarai, taruka", "search.hint": "Rubuta don bincike. Yi amfani da kibiyoyi, sannan Enter.",
    "search.empty": "Ba a sami sakamako ba.", "search.g.pages": "Shafuka", "search.g.news": "Labarai", "search.g.events": "Taruka", "search.g.faq": "Tambayoyi",
    "crumb.home": "Gida", "crumb.label": "Hanyar shafi", "onpage": "A wannan shafi",
    "sample.badge": "Samfuri", "sample.note": "Abubuwan da ake nuna samfuri ne don duba tsari. Masu gudanarwar makaranta za su maye gurbinsu daga dashboard.",
    "draft.badge": "Rubutun farko", "draft.note": "Rubutun farko, ana jiran amincewar makaranta.",
    "view.all": "Duba duka", "read.more": "Karanta ƙari", "close": "Rufe", "print": "Buga", "copy.link": "Kwafi hanyar haɗi", "copied": "An kwafa",
    "prev": "Na baya", "next": "Na gaba", "today": "Yau", "loadmore": "Nuna ƙari", "showing": "Ana nuna {n} cikin {m}", "next.up": "Ci gaba da bincike",
    "upd.t": "Sabbin labarai da taruka", "upd.d": "Abin da ke faruwa a makaranta.", "news.latest": "Sabbin labarai", "ev.upcoming": "Taruka masu zuwa",
    "upd.none.news": "Babu sanarwa tukuna.", "upd.none.events": "Babu taruka masu zuwa.",
    "cat.notice": "Sanarwa", "cat.exam": "Jarrabawa", "cat.holiday": "Hutu", "cat.achievement": "Nasara", "cat.activity": "Aiki",
    "cat.general": "Gabaɗaya", "cat.meeting": "Taro", "cat.recitation": "Karatu",

    "about.lead": "Al'ummar makaranta da aka gina bisa ilimi, imani da kyakkyawar ɗabi'a.",
    "about.tab.story": "Makarantarmu", "about.tab.vm": "Hangen nesa da manufa", "about.tab.values": "Dabi'u", "about.tab.approach": "Tsarinmu",
    "about.tab.staff": "Ma'aikata", "about.tab.facilities": "Wuraren makaranta", "about.tab.gallery": "Rayuwar makaranta",
    "about.glance": "A taƙaice", "about.g.levels": "Matakai", "about.g.levels.v": "Nursery da Firamare", "about.g.focus": "Muhimmanci", "about.g.focus.v": "Karatun Alƙur'ani da Larabci",
    "about.g.langs": "Harsunan shafi", "about.g.langs.v": "Turanci, Larabci, Hausa", "about.g.motto": "Kalmar jagora",
    "about.vision": "Hangen nesa", "about.mission": "Manufa", "about.values": "Dabi'unmu", "about.philosophy": "Falsafar ilimi", "about.quranic": "Karatun Alƙur'ani da Larabci",
    "about.staff": "Bayanan ma'aikata", "about.staff.empty": "Bayanan ma'aikata da aka amince da su za su bayyana a nan idan makaranta ta samar.",
    "about.facilities": "Wuraren makaranta", "about.facilities.empty": "Za a jera wuraren makaranta a nan idan makaranta ta tabbatar.",
    "about.gallery": "Rayuwar makaranta", "gal.note": "Ana nuna zane-zane har sai makaranta ta bayar da hotuna da aka amince da su.",

    "acad.lead": "Karatun nursery, firamare da sakandare tare da karatun Alƙur'ani da Larabci a tsakiya.",
    "acad.level": "Matakin shirin", "acad.subjects": "Darussa", "acad.classes": "Azuzuwa", "acad.classes.empty": "Makaranta za ta tabbatar da jerin azuzuwan wannan matakin.",
    "acad.approach": "Tsarin koyarwa", "acad.resources": "Kayan koyo",
    "acad.resources.d": "Bidiyo, wasanni, takardun aiki da jarrabawa da aka amince da su za su kasance a Cibiyar Koyo.", "acad.go.resources": "Je zuwa Kayan Koyo",
    "sub.qa": "Alƙur'ani da Larabci", "sub.core": "Darussa na asali", "sub.creative": "Ƙirƙira da motsa jiki", "sub.count": "Darussa {n}",

    "news.lead": "Sanarwa, jarrabawa, hutu, nasarori da ayyuka.", "news.search": "Bincika labarai", "news.archived": "Nuna na tarihi",
    "news.pinned": "An liƙa", "news.empty": "Babu labaran da suka dace.", "news.cats": "Rukunoni", "post.published": "An wallafa", "news.archived.tag": "Na tarihi",

    "ev.lead": "Taruka, jarrabawa, taro, hutu da shirye-shiryen karatun Alƙur'ani.", "ev.view.cal": "Kalanda", "ev.view.list": "Jeri",
    "ev.past": "Nuna taruka na baya", "ev.print": "Buga kalanda", "ev.ics": "Zazzage kalanda (.ics)", "ev.add": "Ƙara a kalandata",
    "ev.when": "Lokaci", "ev.where": "Wuri", "ev.none": "Babu taruka da za a nuna.", "ev.more": "+{n} ƙari", "ev.allday": "Duk rana", "ev.on": "Taruka a {d}",
    "ev.views": "Kallo", "ev.cats": "Rukunonin taruka", "ev.cal.of": "Kalanda ta {m}",

    "con.lead": "Muna farin cikin taimaka. Aika saƙo ko ziyarci makaranta.",
    "con.info": "Bayanan makaranta", "con.address": "Adireshi", "con.phone": "Waya", "con.email": "Imel", "con.whatsapp": "WhatsApp", "con.hours": "Lokutan aiki", "con.map": "Kwatance",
    "con.tbc": "Makaranta za ta tabbatar", "con.open.map": "Buɗe taswira", "con.chat": "Yi hira a WhatsApp",
    "form.t": "Aiko mana saƙo", "form.unset": "Lura: makaranta ba ta saita WhatsApp ko imel ba tukuna, saboda haka ba za a iya isar da saƙonni daga wannan fom ba.",
    "f.name": "Sunanka", "f.phone": "Waya ko WhatsApp (ba dole ba)", "f.email": "Imel (ba dole ba)", "f.subject": "Maudu'i", "f.subject.choose": "Zaɓi maudu'i",
    "f.s.admissions": "Tambaya game da shiga", "f.s.general": "Tambaya gabaɗaya", "f.s.portal": "Taimakon shafin iyaye", "f.s.feedback": "Ra'ayi", "f.s.other": "Wani abu",
    "f.message": "Saƙo", "f.consent": "Na amince makaranta ta yi amfani da waɗannan bayanai don amsa mini.", "f.via": "Aika ta hanyar",
    "f.send": "Aika saƙo", "f.send.wa": "Aika ta WhatsApp", "f.send.mail": "Aika ta imel", "f.copy": "Kwafi saƙo", "f.count": "{n} / 1000", "f.required": "Wajibi",
    "e.name": "Da fatan za a shigar da sunanka.", "e.contact": "Da fatan za a bayar da lambar waya ko imel don makaranta ta amsa.", "e.email": "Da fatan za a shigar da imel mai inganci.",
    "e.phone": "Da fatan za a shigar da lambar waya mai inganci.", "e.subject": "Da fatan za a zaɓi maudu'i.", "e.message": "Da fatan za a rubuta aƙalla haruffa 10.",
    "e.consent": "Da fatan za a saka alama don ci gaba.", "e.slow": "Da fatan za a duba saƙonka a sake gwadawa nan da ɗan lokaci.", "e.rate": "Saƙonni da yawa daga wannan na'ura. A sake gwadawa daga baya.",
    "e.fix": "Da fatan za a gyara filayen da aka nuna.",
    "r.none": "Ba a aika ba. Makaranta ba ta saita WhatsApp ko imel ba tukuna, saboda haka saƙonka bai isa ba. Za ka iya kwafarsa ka aika ta wata hanya.",
    "r.wa": "Ana buɗe WhatsApp da saƙonka. Danna Aika a can don isar da shi.", "r.mail": "Ana buɗe manhajar imel da saƙonka. Danna Aika a can don isar da shi.",
    "faq.t": "Tambayoyin da ake yawan yi", "faq.search": "Bincika tambayoyi", "faq.none": "Babu tambayoyin da suka dace.",
    "visit.t": "Shiga da ziyara", "visit.d": "Nemi shiga ta intanet, bibiyi buƙatarka, ko tuntuɓi ofishin makaranta don tambaya game da shiga.",
    "visit.cta": "Aika wa makaranta saƙo"
  });
  add("en", { "footer.pages": "Pages", "footer.portals": "Portals", "con.none.footer": "To be confirmed by the school" });
  add("ar", { "footer.pages": "الصفحات", "footer.portals": "البوابات", "con.none.footer": "ستؤكدها المدرسة" });
  add("en", {"card.about.t": "About the School", "card.about.d": "Vision, mission, values, staff profiles and facilities.", "card.academics.t": "Academics", "card.academics.d": "Nursery and primary programmes, Qur'anic studies and Arabic.", "card.news.t": "News & Announcements", "card.news.d": "Notices, exams, holidays and achievements.", "card.events.t": "Events & Calendar", "card.events.d": "Calendar and list views of school events.", "card.contact.t": "Contact & Support", "card.contact.d": "Contact form, school details and answers to common questions."});
  add("ar", {"card.about.t": "عن المدرسة", "card.about.d": "الرؤية والرسالة والقيم والكادر والمرافق.", "card.academics.t": "البرامج الأكاديمية", "card.academics.d": "برامج الحضانة والابتدائي والدراسات القرآنية واللغة العربية.", "card.news.t": "الأخبار والإعلانات", "card.news.d": "الإشعارات والاختبارات والعطل والإنجازات.", "card.events.t": "الفعاليات والتقويم", "card.events.d": "عرض التقويم والقائمة لفعاليات المدرسة.", "card.contact.t": "التواصل والدعم", "card.contact.d": "نموذج التواصل وبيانات المدرسة وإجابات الأسئلة الشائعة."});
  add("ha", {"card.about.t": "Game da Makaranta", "card.about.d": "Hangen nesa, manufa, dabi'u, ma'aikata da kayan aiki.", "card.academics.t": "Karatu", "card.academics.d": "Shirye-shiryen nursery da firamare, karatun Alƙur'ani da Larabci.", "card.news.t": "Labarai da Sanarwa", "card.news.d": "Sanarwa, jarrabawa, hutu da nasarori.", "card.events.t": "Abubuwan da ke faruwa da Kalanda", "card.events.d": "Kalanda da jerin abubuwan makaranta.", "card.contact.t": "Tuntuɓa da Taimako", "card.contact.d": "Fom ɗin tuntuɓa, bayanan makaranta da amsoshin tambayoyi."});
  add("en", { "pg.privacy": "Privacy Notice", "pg.privacy.lead": "How this website handles your information.", "footer.privacy": "Privacy notice" });
  add("ar", { "pg.privacy": "إشعار الخصوصية", "pg.privacy.lead": "كيف يتعامل هذا الموقع مع معلوماتك.", "footer.privacy": "إشعار الخصوصية" });
  add("ha", { "pg.privacy": "Sanarwar Sirri", "pg.privacy.lead": "Yadda wannan shafi ke kula da bayananka.", "footer.privacy": "Sanarwar sirri" });
  add("ha", { "footer.pages": "Shafuka", "footer.portals": "Hanyoyin shiga", "con.none.footer": "Makaranta za ta tabbatar" });
  add("en", {"nav.signin": "Sign in", "signin.staff": "Staff dashboard", "signin.staff.d": "For teachers, office and administrators", "signin.parent": "Parent portal", "signin.parent.d": "See your children and school notices", "skip": "Skip to main content", "totop": "Back to top"});
  add("ar", {"nav.signin": "تسجيل الدخول", "signin.staff": "لوحة الموظفين", "signin.staff.d": "للمعلمين والمكتب والإداريين", "signin.parent": "بوابة أولياء الأمور", "signin.parent.d": "شاهد أبناءك وإشعارات المدرسة", "skip": "انتقل إلى المحتوى الرئيسي", "totop": "العودة إلى الأعلى"});
  add("ha", {"nav.signin": "Shiga", "signin.staff": "Allon ma'aikata", "signin.staff.d": "Ga malamai, ofis da shugabanni", "signin.parent": "Dandalin iyaye", "signin.parent.d": "Duba 'ya'yanka da sanarwar makaranta", "skip": "Tsallake zuwa babban abun ciki", "totop": "Koma sama"});
})();
