
(() => {
  'use strict';

  const SUPABASE_URL = 'https://kjxwecacomkbyfqvnrob.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_3bKuwoJLCtf_bFcChNwUeg_ULngjygg';

  if (!window.supabase?.createClient) {
    alert('کتابخانه Supabase بارگذاری نشده است.');
    return;
  }

  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  const $ = (s) => document.querySelector(s);

  function normalizeFa(value) {
    return value.toLowerCase()
      .replace(/[يى]/g, 'ی')
      .replace(/ك/g, 'ک')
      .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 1632))
      .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 1776))
      .replace(/[\u064B-\u0652\u0670\u0640\u200C\u200D]/g, '')
      .replace(/[\s.,\u060C\u061F?!:;\u00AB\u00BB"'…-]+/g, ' ')
      .trim();
  }

  async function studentEmail(username) {
    const normalized = normalizeFa(username);
    const bytes = new TextEncoder().encode(normalized);
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    const hex = [...new Uint8Array(hash)]
      .map(x => x.toString(16).padStart(2, '0')).join('');
    return 's' + hex.slice(0, 32) + '@students.thirdgrade.invalid';
  }

  function show(message) {
    if (typeof window.alert === 'function') window.alert(message);
    else alert(message);
  }

  function authPage(message = '') {
    h(`<div class="hero">
      <span class="sn">☀️</span>
      <div class="bub">سلام! به مدرسه‌ی شاد خوش آمدی 🎈</div>
      <div class="mas">🦉</div>
    </div>
    <div class="card lg">
      <h2>🔑 ورود به حساب</h2>
      ${message ? `<p>${message}</p>` : ''}
      <input id="online-user" placeholder="نام کاربری دانش‌آموز یا ایمیل معلم">
      <input id="online-pass" type="password" placeholder="رمز عبور">
      <button style="width:100%" onclick="onlineLogin()">ورود 🚀</button>
      <button style="width:100%;background:var(--p)" onclick="onlineRegisterPage()">ثبت‌نام دانش‌آموز جدید ✨</button>
    </div>`);
  }

  window.onlineRegisterPage = function () {
    h(`<div class="card lg">
      <h2>✨ ثبت‌نام دانش‌آموز</h2>
      <input id="reg-name" placeholder="نام کاربری (۳ تا ۴۰ نویسه)">
      <input id="reg-nick" placeholder="نام و نام خانوادگی">
      <input id="reg-code" placeholder="کد کلاس">
      <input id="reg-pass" type="password" placeholder="رمز عبور (حداقل ۶ نویسه)">
      <input id="reg-pass2" type="password" placeholder="تکرار رمز عبور">
      <button style="width:100%;background:var(--g)" onclick="onlineRegister()">ثبت‌نام 🎉</button>
      <button style="width:100%" onclick="onlineShowLogin()">بازگشت به ورود</button>
    </div>`);
  };

  window.onlineShowLogin = () => authPage();

  window.onlineRegister = async function () {
    const username = $('#reg-name')?.value.trim() || '';
    const nickname = $('#reg-nick')?.value.trim() || '';
    const code = $('#reg-code')?.value.trim() || '';
    const password = $('#reg-pass')?.value || '';
    const password2 = $('#reg-pass2')?.value || '';

    if (username.length < 3 || username.length > 40)
      return show('نام کاربری باید بین ۳ تا ۴۰ نویسه باشد.');

    if (!/^[\u0600-\u06FF\u200C A-Za-z0-9._-]+$/.test(username))
      return show('در نام کاربری فقط حروف فارسی و انگلیسی، عدد و . _ - مجاز است.');

    if (!nickname || !code)
      return show('نام و کد کلاس را کامل وارد کن.');

    if (password.length < 6)
      return show('رمز عبور باید حداقل ۶ نویسه باشد.');

    if (password !== password2)
      return show('رمز عبور و تکرار آن یکسان نیست.');

    try {
      const email = await studentEmail(username);
      const { data, error } = await db.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            nickname,
            join_code: code
          }
        }
      });

      if (error) throw error;

      if (!data.session) {
        return authPage('حساب ساخته شد. برای ورود، تأیید ایمیل باید در تنظیمات Supabase غیرفعال باشد؛ چون حساب دانش‌آموز ایمیل واقعی ندارد.');
      }

      show('ثبت‌نام انجام شد. درخواست شما برای تأیید معلم ارسال شد.');
      await db.auth.signOut();
      authPage();
    } catch (error) {
      show('ثبت‌نام انجام نشد: ' + (error.message || 'خطای نامشخص'));
    }
  };

  window.onlineLogin = async function () {
    const username = $('#online-user')?.value.trim() || '';
    const password = $('#online-pass')?.value || '';

    if (!username || !password)
      return show('نام کاربری و رمز را وارد کن.');

    try {
      const email = username.includes('@') ? username : await studentEmail(username);

      const { data, error } = await db.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      const { data: profile, error: profileError } = await db
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError) throw profileError;

      if (profile.role === 'teacher') {
        await teacherPanel();
        return;
      }

      if (profile.is_active === false) {
        await db.auth.signOut();
        return authPage('حساب شما هنوز فعال نشده است.');
      }

      const { data: memberships, error: memberError } = await db
        .from('class_members')
        .select('status')
        .eq('student_id', data.user.id);

      if (memberError) throw memberError;

      if (!memberships?.some(m => m.status === 'approved')) {
        await db.auth.signOut();
        return authPage('ثبت‌نام شما در انتظار تأیید معلم است.');
      }

      D.cur = profile.username || profile.nickname || username;
      D.users ??= {};
      D.users[D.cur] ??= { pts: 0, ok: 0, no: 0, pr: {}, log: [] };
      home();

    } catch (error) {
      show('ورود انجام نشد: ' + (error.message || 'نام کاربری یا رمز اشتباه است.'));
    }
  };

  async function teacherPanel() {
    const { data: classes, error } = await db
      .from('classes')
      .select('id,name,grade_label')
      .order('name');

    if (error) return show('دریافت کلاس‌ها انجام نشد: ' + error.message);

    let content = `<div class="card">
      <h2>👩‍🏫 پنل معلم</h2>
      <p>مدیریت درخواست ثبت‌نام دانش‌آموزان</p>
      <button onclick="onlineLogout()" style="background:var(--r)">خروج</button>
    </div>`;

    for (const cls of (classes || [])) {
      const { data: members, error: memberError } = await db
        .from('class_members')
        .select('student_id,status')
        .eq('class_id', cls.id);

      if (memberError) {
        content += `<div class="card"><p>خطا در دریافت اعضای کلاس ${cls.name}</p></div>`;
        continue;
      }

      const ids = (members || []).map(m => m.student_id);
      let profiles = [];

      if (ids.length) {
        const result = await db.from('profiles')
          .select('id,username,nickname,role')
          .in('id', ids);
        if (!result.error) profiles = result.data || [];
      }

      content += `<div class="card">
        <h3>🏫 ${cls.name}</h3>
        <p>${cls.grade_label || ''}</p>`;

      for (const member of (members || [])) {
        const p = profiles.find(x => x.id === member.student_id);
        if (!p) continue;

        content += `<div class="card">
          <b>👦 ${p.nickname || p.username || 'دانش‌آموز'}</b>
          <p>نام کاربری: ${p.username || '—'}</p>
          <p>وضعیت: ${member.status}</p>
          ${member.status === 'pending' ? `
            <button onclick="onlineReview('${cls.id}','${member.student_id}','approve')">تأیید ✅</button>
            <button style="background:var(--r)" onclick="onlineReview('${cls.id}','${member.student_id}','reject')">رد درخواست</button>
          ` : ''}
        </div>`;
      }

      content += `</div>`;
    }

    h(content);
  }

  window.onlineReview = async function (classId, studentId, action) {
    const { error } = await db.rpc('review_member', {
      p_class_id: classId,
      p_student_id: studentId,
      p_action: action
    });

    if (error) return show('انجام نشد: ' + error.message);

    show(action === 'approve' ? 'دانش‌آموز تأیید شد.' : 'درخواست رد شد.');
    await teacherPanel();
  };

  window.onlineLogout = async function () {
    await db.auth.signOut();
    D.cur = '';
    authPage();
  };

  // ورود آنلاین جایگزین ورود محلی می‌شود.
  window.login = () => authPage();
  window.rgf = () => onlineRegisterPage();
  window.rg = () => onlineRegister();
  window.go = () => onlineLogin();
  window.adm = () => authPage('برای ورود معلم، ایمیل و رمز حساب معلم را وارد کن.');

  // در شروع، صفحه ورود آنلاین نمایش داده می‌شود.
  db.auth.getSession().then(({ data }) => {
    if (!data.session) authPage();
  });
})();
