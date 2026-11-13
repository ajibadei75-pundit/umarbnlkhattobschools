/* Student portal strings (EN, AR, HA). Arabic and Hausa are drafts for review by fluent speakers. */
(function () {
  var T = window.UBK_I18N;
  function add(l, o) { Object.keys(o).forEach(function (k) { T[l][k] = o[k]; }); }
  add("en", { "pt.student": "Student portal", "st.login.d": "Enter your Student ID and the 6-digit PIN your school gave you.", "st.pin": "PIN", "st.forgot": "Forgot your PIN? Ask your class teacher or the school office.",
    "st.e.bad": "The Student ID or PIN is not correct.", "st.e.lock": "Too many wrong tries. Please wait 15 minutes and try again.", "st.e.rate": "Too many attempts. Please wait a little and try again.", "st.e.net": "Could not connect. Check your internet and try again.", "st.need": "Enter your Student ID and your 6-digit PIN.",
    "st.hello": "Hello,", "st.result": "My result", "st.notyet": "Your result has not been released yet. Your school will release it when it is ready.", "st.ready": "Your result is ready.", "st.learn": "Learn and play", "st.learn.d": "Videos, quizzes and games checked by your school.", "rs.view": "View result" });
  add("ar", { "pt.student": "بوابة الطالب", "st.login.d": "أدخل رقم الطالب والرقم السري المكوّن من 6 أرقام الذي أعطته لك المدرسة.", "st.pin": "الرقم السري", "st.forgot": "نسيت الرقم السري؟ اسأل معلم الصف أو مكتب المدرسة.",
    "st.e.bad": "رقم الطالب أو الرقم السري غير صحيح.", "st.e.lock": "محاولات خاطئة كثيرة. انتظر 15 دقيقة ثم حاول مرة أخرى.", "st.e.rate": "محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.", "st.e.net": "تعذّر الاتصال. تحقق من الإنترنت وحاول مرة أخرى.", "st.need": "أدخل رقم الطالب والرقم السري المكوّن من 6 أرقام.",
    "st.hello": "مرحبًا،", "st.result": "نتيجتي", "st.notyet": "لم تُعلن نتيجتك بعد. ستعلنها المدرسة عندما تكون جاهزة.", "st.ready": "نتيجتك جاهزة.", "st.learn": "تعلّم والعب", "st.learn.d": "فيديوهات واختبارات وألعاب تراجعها مدرستك.", "rs.view": "عرض النتيجة" });
  add("ha", { "pt.student": "Shafin Ɗalibi", "st.login.d": "Shigar da lambar ɗalibi da PIN mai lamba 6 da makaranta ta ba ka.", "st.pin": "PIN", "st.forgot": "Ka manta PIN ɗinka? Ka tambayi malamin ajinku ko ofishin makaranta.",
    "st.e.bad": "Lambar ɗalibi ko PIN ba daidai ba ne.", "st.e.lock": "Kurakurai da yawa. Jira minti 15 sannan ka sake gwadawa.", "st.e.rate": "Ƙoƙari da yawa. Jira kaɗan ka sake gwadawa.", "st.e.net": "Ba a iya haɗawa ba. Duba intanet ɗinka ka sake gwadawa.", "st.need": "Shigar da lambar ɗalibi da PIN mai lamba 6.",
    "st.hello": "Sannu,", "st.result": "Sakamakona", "st.notyet": "Ba a fitar da sakamakonka ba tukuna. Makaranta za ta fitar idan ya kammala.", "st.ready": "Sakamakonka ya shirya.", "st.learn": "Koyi ka yi wasa", "st.learn.d": "Bidiyoyi, jarabawa da wasanni da makaranta ta duba.", "rs.view": "Duba sakamako" });
})();
