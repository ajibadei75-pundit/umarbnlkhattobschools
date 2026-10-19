/* Website settings. In Section 4 these come from the admin "Website Settings" screen.
   null / [] means "not added yet": the site shows an honest empty state instead of inventing details. */
window.UBK_SITE = {
  /* While true, clearly labelled sample news, events and FAQ answers are shown so the site can be previewed.
     Set to false at launch and only real, published content appears. */
  showSamples: true,
  contact: {
    address: null,                 /* e.g. "12 Example Road, City" */
    phones: [],                    /* e.g. ["+234 800 000 0000"] */
    email: null,                   /* e.g. "info@example.org" */
    whatsapp: null,                /* digits only with country code, e.g. "2348000000000" */
    hours: [],                     /* e.g. [{ days: "Monday to Friday", time: "8:00 am to 4:00 pm" }] */
    mapUrl: null                   /* a https://... link to the school's map location */
  }
};
