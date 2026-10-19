/* School contact details. The school's administrator fills these in (later: Website Settings in the dashboard).
   Nothing here is invented: empty values show "To be confirmed by the school" on the site. */
window.UBK_SITE = {
  admissions: { phone: "08169383031", tel: "+2348169383031", whatsapp: "2348169383031" },  /* the ONLY number for admission enquiries */
  address: "",
  phones: [],            /* e.g. ["+234 800 000 0000"] */
  email: "",             /* e.g. "info@example.com" */
  whatsapp: "",          /* digits only with country code, e.g. "2348000000000" */
  mapUrl: "",            /* a Google Maps (or similar) link to the school */
  activityPhotos: {},    /* approved photos, e.g. { quran: "assets/img/activities/quran.jpg" } (ids: morning, quran, sports, arabic, nursery, evening) */
  backend: { url: "https://spwkinanpvlnbfthalbk.supabase.co", key: "sb_publishable_rD6aY1PCAPQlCrinKF-8Xw_O-Hl8AhR" },  /* public (publishable) key: safe in the browser; data is protected by database rules */
  hours: []              /* e.g. [{ days: "Monday to Friday", time: "8:00 AM to 3:00 PM" }] */
};
