
/* ============================================================
   V13 EVOLUTION — JAVASCRIPT ENGINE
   ============================================================ */

// ---- STATE ----
let db = {
  lvl: 'Sprout',
  lang: 'EN',
  dictionary: [],
  unknown: [],
  readings: [],
  weekActivity: {},
  stats: { completed: {}, correct: 0, total: 0, learnedWords: 0, listenCount: 0 },
  profile: { name: '', avatar: '😊', goal: 10 },
  settings: { darkMode: false, notifications: false, sound: true },
  onboardingDone: false,
  todayWords: 0,
  todayDate: '',
  badges: [],
};

// ---- LEVEL CONFIG ----
const LEVELS = [
  { id:'Sprout',   icon:'🌱', cefr:'A1', color:'#4ade80', dark:'#16a34a' },
  { id:'Sapling',  icon:'🌿', cefr:'A2', color:'#34d399', dark:'#059669' },
  { id:'Tree',     icon:'🌳', cefr:'B1', color:'#fbbf24', dark:'#d97706' },
  { id:'Forest',   icon:'🌲', cefr:'B2', color:'#fb923c', dark:'#ea580c' },
  { id:'Mountain', icon:'🏔️', cefr:'C1', color:'#f87171', dark:'#dc2626' },
  { id:'Galaxy',   icon:'🚀', cefr:'C2', color:'#a78bfa', dark:'#7c3aed' },
];
const lvlByCefr = { A1:'Sprout',A2:'Sapling',B1:'Tree',B2:'Forest',C1:'Mountain',C2:'Galaxy' };

// ---- I18N ----
const i18n = {
  EN: {
    navStories:'Stories', navVocab:'Unknown Word Vault', navDict:'Dictionary Study', navStats:'Statistics',
    back:'Back', home:'Home', startTest:'Start Test', goHome:'Go Home',
    iKnow:'I Know It', again:'Again', statistics:'Statistics',
    dataCenter:'Data Management', wordUpload:'Word Upload (10 Columns)',
    readingUpload:'Reading Upload (Block Format)', pasteLoad:'Paste & Load',
    fileSelect:'Select File', backup:'Backup', restore:'Restore',
    resetSystem:'Reset System', daysStreak:'Days Streak', dailyGoal:'Daily Goal',
    wellDone:'Goal achieved! Keep going! 🎯',
    notYet:'Complete a story or quiz today! 💪',
    appTitle:'Master English',
  },
  TR: {
    navStories:'Okuma Metinleri', navVocab:'Bilinmeyen Kelimeler Kasası', navDict:'Sözlük Çalış', navStats:'İstatistikler',
    back:'Geri', home:'Ana Sayfa', startTest:'Testi Başlat', goHome:'Ana Sayfaya Dön',
    iKnow:'Biliyorum', again:'Tekrar', statistics:'İstatistikler',
    dataCenter:'Veri Yönetimi', wordUpload:'Kelime Yükleme (10 Sütun)',
    readingUpload:'Reading Yükleme (Blok Format)', pasteLoad:'Yapıştırarak Yükle',
    fileSelect:'Dosya Seç', backup:'Yedek Al', restore:'Geri Yükle',
    resetSystem:'Sistemi Sıfırla', daysStreak:'Gün Serisi', dailyGoal:'Günlük Hedef',
    wellDone:'Hedef tamamlandı! Devam et! 🎯',
    notYet:"Bugün bir metin oku ya da test çöz! 💪",
    appTitle:'Master İngilizce',
  }
};

const QUOTES = {
  EN: {
    active: [
      '"Consistency is the bridge between goals and accomplishment."',
      '"Every word you learn is a new door opened."',
      '"Small progress is still progress — keep going!"',
    ],
    inactive: [
      '"Start again tomorrow — every champion was once a beginner."',
      '"Rest today, conquer tomorrow. You\'ve got this!"',
      '"Missing one day? That\'s how heroes are forged."',
    ]
  },
  TR: {
    active: [
      '"Tutarlılık, hedefler ile başarı arasındaki köprüdür."',
      '"Her öğrendiğin kelime, yeni bir kapı açar."',
      '"Küçük ilerleme de ilerlemedir — devam et!"',
    ],
    inactive: [
      '"Yarın yeniden başla — her şampiyon bir zamanlar yeniydi."',
      '"Bugün dinlen, yarın kazan. Başarabilirsin!"',
      '"Bir gün kaçırdın mı? Kahramanlar böyle yetişir."',
    ]
  }
};

// ---- PERSISTENCE ----
const STORAGE_KEY = 'master_eng_v13';
const DICT_CACHE_KEY = 'lv_dict_cache_v1';  // kelimeler kalıcı cache
const READ_CACHE_KEY = 'lv_read_cache_v1';  // readings kalıcı cache
// AUTH sabitlerini save() öncesinde tanımla (TDZ hatasını önler)
const AUTH_USERS_KEY   = 'lv_auth_users';
const AUTH_SESSION_KEY = 'lv_auth_session';

// Kaydetme: dictionary ve readings HARİÇ (bunlar JS dosyasından gelir)
// Sadece kullanıcı verisini kaydet: profil, kelime kasası, istatistik, ayarlar
const save = () => {
  const toSave = {
    lvl:            db.lvl,
    lang:           db.lang,
    unknown:        db.unknown,
    weekActivity:   db.weekActivity,
    stats:          db.stats,
    profile:        db.profile,
    settings:       db.settings,
    onboardingDone: db.onboardingDone,
    todayWords:     db.todayWords,
    todayDate:      db.todayDate,
    badges:         db.badges,
    unlockedLevels: db.unlockedLevels || [],
    todayRead:      db.todayRead || 0,
    todayListen:    db.todayListen || 0,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    // User-specific save for admin progress tracking
    const session = getAuthSession ? getAuthSession() : null;
    if (session) {
      try { localStorage.setItem('master_eng_v13_' + session, JSON.stringify(toSave)); } catch(e2) {}
    }
  } catch(e) {
    console.warn('localStorage yazma hatası:', e);
  }
};

// Yükleme: kullanıcı verisini geri al, dictionary/readings JS'den gelecek
const load = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      // dictionary ve readings'i EZME — JS dosyasından gelecek
      delete parsed.dictionary;
      delete parsed.readings;
      db = { ...db, ...parsed };
    }
  } catch(e) {
    console.warn('localStorage okuma hatası:', e);
  }
};

// ---- TOAST ----
function notify(msg) {
  const t = document.getElementById('toast');
  t.innerText = msg;
  t.className = 'show';
  setTimeout(() => t.className = '', 2600);
}

// ---- LANGUAGE ----
function toggleLang() {
  db.lang = db.lang === 'EN' ? 'TR' : 'EN';
  save();
  applyLang();
}
function applyLang() {
  const L = db.lang;
  document.getElementById('lt-en').className = L==='EN'?'active':'';
  document.getElementById('lt-tr').className = L==='TR'?'active':'';
  // Logo sabit kalır (appLogoText artık yok)
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (i18n[L][key]) el.innerText = i18n[L][key];
  });
  updateHero();
}

// ---- LEVEL SYSTEM ----
function getLvlConfig(id) { return LEVELS.find(l => l.id === id) || LEVELS[0]; }

function applyLevel(id) {
  db.lvl = id;
  document.body.setAttribute('data-level', id);
  document.querySelectorAll('.level-btn').forEach(b => {
    b.classList.toggle('selected', b.dataset.lvl === id);
  });
  save();
  applyLang();
}

function buildLevelGrid() {
  const grid = document.getElementById('lvlGrid');
  grid.innerHTML = '';
  LEVELS.forEach((l, i) => {
    const btn = document.createElement('button');
    btn.className = 'level-btn';
    btn.dataset.lvl = l.id;
    btn.style.background = `linear-gradient(135deg, ${l.color}, ${l.dark})`;
    btn.innerHTML = `
      <span class="lvl-icon">${l.icon}</span>
      <span>${l.id}</span>
      <span class="lvl-cefr">${l.cefr}</span>`;
    btn.onclick = () => {
      const currentIdx = LEVELS.findIndex(x => x.id === db.lvl);
      const targetIdx  = i;
      const isAdmin    = isSuperAdminUser();
      // Admin bypass: show choice modal
      if (isAdmin && targetIdx !== currentIdx) {
        if (confirm(`Admin erişimi: ${l.icon} ${l.id} seviyesine direkt geçmek ister misiniz?
(İptal = Sınav)`)) {
          applyLevel(l.id);
          notify(`${l.icon} ${l.id} seviyesine admin olarak geçildi`);
        } else {
          openLevelGate(l.id);
        }
        return;
      }
      const unlockedLevels = db.unlockedLevels || [];
      if (targetIdx <= currentIdx || unlockedLevels.includes(l.id)) {
        // Alt/aynı seviye veya zaten geçilmiş seviye — direkt içerik
        applyLevel(l.id);
        tabGo('learn');
      } else if (targetIdx === currentIdx + 1) {
        // Bir üst seviye — sınav aç
        openLevelGate(l.id);
      } else {
        // İki+ seviye atlama — izin verme
        notify('⚠️ Seviyeleri sırayla geçmelisiniz!');
      }
    };
    if (db.lvl === l.id) btn.classList.add('selected');
    grid.appendChild(btn);
  });
}

// ---- STREAK & HERO ----
function todayKey() { return new Date().toISOString().slice(0,10); }
function markToday() { db.weekActivity[todayKey()] = true; save(); }

function streakCount() {
  let count = 0;
  const d = new Date();
  while(true) {
    const key = d.toISOString().slice(0,10);
    if (db.weekActivity[key]) { count++; d.setDate(d.getDate()-1); }
    else break;
  }
  return count;
}

function todayDone() { return !!db.weekActivity[todayKey()]; }

function updateHero() {
  const L = db.lang;
  const streak = streakCount();
  const done = todayDone();
  document.getElementById('heroTarget').innerText = done ? '🎯' : '☹️';
  document.getElementById('heroStreak').innerText = `${streak} ${i18n[L].daysStreak}`;
  const qArr = done ? QUOTES[L].active : QUOTES[L].inactive;
  document.getElementById('heroQuote').innerText = qArr[streak % qArr.length];
}

function buildWeekRow() {
  const row = document.getElementById('weekRow');
  row.innerHTML = '';
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const daysTR = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];
  const today = new Date();
  const todayDow = (today.getDay() + 6) % 7; // Mon=0

  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - todayDow + i);
    const key = d.toISOString().slice(0,10);
    const done = !!db.weekActivity[key];
    const isToday = i === todayDow;

    const div = document.createElement('div');
    div.className = 'day-dot';
    div.innerHTML = `
      <div class="dot${done?' done':''}${isToday?' today':''}">
        ${done ? '✓' : (isToday ? '·' : '')}
      </div>
      <label>${db.lang==='TR' ? daysTR[i] : days[i]}</label>
    `;
    row.appendChild(div);
  }
}

// ---- SHOW SCREEN ----
function show(id) {
  // Stop audio if leaving reading screen
  if (id !== 'readMod') stopS();

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');

  // Manage body scroll - lock when reading screen is open (it's position:fixed)
  document.body.style.overflow = (id === 'readMod') ? 'hidden' : '';

  if (id === 'home') { updateHero(); buildWeekRow(); }
  if (id === 'readList') renderReadList();
  if (id === 'settings') {
    updateLoadStatus();
    if (typeof renderAdminDataInfo === 'function') renderAdminDataInfo();
  }

  // V15: Tab bar visibility — hide during immersive screens
  const noTab = ['cardScreen', 'quizScreen', 'resultScreen', 'readMod'];
  const tabBar = document.getElementById('tabBar');
  if (tabBar && (typeof db !== 'undefined') && db.onboardingDone) {
    tabBar.style.display = noTab.includes(id) ? 'none' : 'flex';
  }
}

// ---- TOPIC EMOJI MAP ----
function getTopicEmoji(title) {
  const t = title.toLowerCase();
  if (t.includes('airport') || t.includes('flight'))           return '✈️';
  if (t.includes('football') || t.includes('match'))           return '⚽';
  if (t.includes('family') || t.includes('away from'))         return '👨‍👩‍👧‍👦';
  if (t.includes('friend'))                                    return '👫';
  if (t.includes('job interview') || t.includes('first day'))  return '💼';
  if (t.includes('university') || t.includes('school') || t.includes('english class')) return '🎓';
  if (t.includes('daily routine') || t.includes('daily life')) return '⏰';
  if (t.includes('healthy') || t.includes('health'))           return '🥗';
  if (t.includes('stress') || t.includes('relaxation'))        return '🧘';
  if (t.includes('technology') || t.includes('online'))        return '💻';
  if (t.includes('environment') || t.includes('world'))        return '🌍';
  if (t.includes('metro') || t.includes('bus') || t.includes('transport')) return '🚌';
  if (t.includes('news'))                                      return '📰';
  if (t.includes('money') || t.includes('saving') || t.includes('part-time')) return '💰';
  if (t.includes('city') || t.includes('moving'))              return '🏙️';
  if (t.includes('turkey'))                                    return '🇹🇷';
  if (t.includes('team') || t.includes('work'))                return '👥';
  if (t.includes('language') || t.includes('learning') || t.includes('foreign')) return '🌐';
  if (t.includes('mistake') || t.includes('turning point'))    return '✨';
  if (t.includes('culture') || t.includes('diplomacy'))        return '🤝';
  if (t.includes('decision') || t.includes('choice'))          return '🎯';
  if (t.includes('future') || t.includes('plan'))              return '🚀';
  if (t.includes('time') || t.includes('managing'))            return '⏱️';
  if (t.includes('advice') || t.includes('suggestion'))        return '💡';
  if (t.includes('opinion') || t.includes('giving'))           return '🗣️';
  if (t.includes('emotion') || t.includes('feeling'))          return '😊';
  if (t.includes('story') || t.includes('telling'))            return '📖';
  if (t.includes('email') || t.includes('written'))            return '📧';
  if (t.includes('speaking') || t.includes('public'))          return '🎤';
  if (t.includes('listening') || t.includes('silence'))        return '👂';
  if (t.includes('community') || t.includes('helping'))        return '🙋';
  if (t.includes('problem') || t.includes('solving'))          return '🔧';
  if (t.includes('conflict') || t.includes('sandwich'))        return '🕊️';
  if (t.includes('hobby') || t.includes('hobbies') || t.includes('free time')) return '🎨';
  if (t.includes('conversation') || t.includes('everyday'))    return '💬';
  if (t.includes('responsib'))                                 return '🌟';
  if (t.includes('leader') || t.includes('power entry'))       return '👑';
  if (t.includes('pressure') || t.includes('register'))        return '🔥';
  if (t.includes('social') || t.includes('informal'))          return '🤗';
  if (t.includes('person') || t.includes('describ'))           return '👤';
  if (t.includes('wrap') || t.includes('action plan'))         return '📋';
  if (t.includes('clarif'))                                    return '❓';
  if (t.includes('agree') || t.includes('disagree'))           return '🤔';
  if (t.includes('change') || t.includes('dealing'))           return '🔄';
  if (t.includes('experience'))                                return '💬';
  return '📚';
}

// ---- READING LIST ----
function renderReadList() {
  const L = db.lang;
  const title = getLvlConfig(db.lvl);
  document.getElementById('listLvlTitle').innerText = `${title.icon} ${title.id} — ${i18n[L].navStories}`;

  const carousel = document.getElementById('carousel');
  carousel.innerHTML = '';

  const filtered = db.readings.filter(r => {
    const mapped = lvlByCefr[r.lvl] || r.lvl;
    return mapped === db.lvl;
  });

  if (filtered.length === 0) {
    carousel.innerHTML = `<div style="padding:40px;text-align:center;color:var(--muted);width:100%">
      <div style="font-size:3rem;margin-bottom:10px;">📚</div>
      <div>No stories for this level yet.</div>
      <div style="font-size:.8rem;margin-top:6px;">Upload readings in Settings.</div>
    </div>`;
    return;
  }

  filtered.forEach(r => {
    const isDone = db.stats.completed[r.title];
    const lvlCfg = getLvlConfig(db.lvl);
    const card = document.createElement('div');
    card.className = 'read-card';
    card.onclick = () => startReading(r);
    card.innerHTML = `
      <div class="read-card-header">
        <div class="read-card-title">${r.title}</div>
        <span class="read-card-lvl-badge">${lvlCfg.icon} ${lvlCfg.id} <span class="cefr-text">${lvlCfg.cefr}</span></span>
      </div>
      <div class="read-card-img-wrap">
        <div class="read-card-illustration">
          <span class="rc-illus-emoji">${getTopicEmoji(r.title)}</span>
          <span class="rc-illus-label">${r.title}</span>
        </div>
      </div>
      ${isDone ? '<div class="done-badge">✅ Tamamlandı</div>' : ''}
    `;
    carousel.appendChild(card);
  });
}

// Carousel keyboard & button nav
let carouselIndex = 0;
function carouselNav(dir) {
  const c = document.getElementById('carousel');
  const cardWidth = c.querySelector('.read-card')?.offsetWidth || 300;
  c.scrollBy({ left: dir * (cardWidth + 18), behavior: 'smooth' });
}
document.addEventListener('keydown', e => {
  if (document.getElementById('readList').classList.contains('active')) {
    if (e.key === 'ArrowLeft')  carouselNav(-1);
    if (e.key === 'ArrowRight') carouselNav(1);
  }
  // Close active modal on Escape
  if (e.key === 'Escape') {
    const activeModal = document.querySelector('.modal-overlay.active');
    if (activeModal) {
      closeModal(activeModal.id);
      e.preventDefault();
    }
  }
});

// ---- READING MODE ----
let readLangMode = 'EN'; // 'EN' or 'TR'

function renderReadingContent() {
  const area = document.getElementById('readArea');
  area.innerHTML = '';
  const btn = document.getElementById('readLangToggle');

  if (readLangMode === 'TR') {
    // Show Turkish translation - plain text, no word tapping
    btn.innerText = '🌐 EN';
    btn.style.background = '#059669';
    const trText = activeR.tr || 'Türkçe çeviri bulunamadı.';
    const para = document.createElement('p');
    para.style.fontFamily = "'DM Sans', sans-serif";
    para.style.color = '#334155';
    para.style.lineHeight = '1.8';
    para.innerText = trText;
    area.appendChild(para);
  } else {
    // Show English text with interactive word spans
    btn.innerText = '🌐 TR';
    btn.style.background = '#f59e0b';
    const lines = activeR.en.trim().split('\n');
    // Skip the first line if it's just the title (matches r.title)
    const bodyLines = lines.length > 1 ? lines.slice(1) : lines;
    const body = bodyLines.join(' ').trim();

    const para = document.createElement('p');
    let wordIndex = 0;
    body.split(/\s+/).forEach(rawWord => {
      const span = document.createElement('span');
      span.className = 'word-span';
      span.dataset.wi = wordIndex++;   // TTS highlight için index
      const clean = rawWord.toLowerCase().replace(/[^a-z]/g, '');
      const dictMatch = clean ? findDictWord(rawWord) : null;

      // Tooltip oluştur (sözlükte varsa anlam göster)
      if (dictMatch && dictMatch.tr && dictMatch.tr !== '?') {
        const tip = document.createElement('span');
        tip.className = 'word-tooltip';
        tip.innerText = dictMatch.tr;
        span.appendChild(tip);
      }

      // Kelime metnini ekle
      const txt = document.createTextNode(rawWord + ' ');
      span.appendChild(txt);

      if (clean && db.unknown.find(u => u.w === clean)) span.classList.add('is-unknown');

      span.onclick = () => {
        if (!clean) return;
        const existing = db.unknown.findIndex(u => u.w === clean);
        if (existing === -1) {
          db.unknown.push(dictMatch ? {...dictMatch} : { w:clean, tr:'?', te:'?', tt:'?', de:'?', dt:'?', e1:'?', e1t:'?', e2:'?', e2t:'?' });
          span.classList.add('is-unknown');
          save();
          const meaning = dictMatch ? ` (${dictMatch.tr})` : '';
          notify(`"${clean}"${meaning} → Kasaya eklendi 📚`);
        } else {
          db.unknown.splice(existing, 1);
          span.classList.remove('is-unknown');
          save();
          notify(`"${clean}" → Kasadan çıkarıldı 🗑️`);
        }
      };
      para.appendChild(span);
    });
    area.appendChild(para);
  }
}

function toggleReadLang() {
  readLangMode = readLangMode === 'EN' ? 'TR' : 'EN';
  if (readLangMode === 'TR') stopS(); // stop speech when switching to TR
  renderReadingContent();
}

function startReading(r) {
  activeR = r;
  readLangMode = 'EN'; // always start with English
  document.getElementById('readTitle').innerText = r.title;
  renderReadingContent();
  show('readMod');
}

// ---- PARSER ----
function processInput(text, type) {
  if (!text.trim()) return;
  if (type === 'word') {
    let added = 0;
    text.trim().split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const p = trimmed.split('|').map(x => x.trim());
      // Yeni format: ilk alan CEFR seviyesi mi? (A1|A2|B1|B2|C1|C2)
      const hasLevel = /^(A1|A2|B1|B2|C1|C2)$/i.test(p[0]);
      const o = hasLevel ? 1 : 0; // offset
      if (p.length >= 9 + o) {
        // 10+o alanlı tam format, 9+o alanlı kısmi format (tt yok)
        const has10 = p.length >= 10 + o;
        const entry = {
          w:   p[o].toLowerCase(),
          tr:  p[o+1],
          te:  p[o+2],
          tt:  has10 ? p[o+3] : p[o+2],
          de:  has10 ? p[o+4] : p[o+3],
          dt:  has10 ? p[o+5] : p[o+4],
          e1:  has10 ? p[o+6] : p[o+5],
          e1t: has10 ? p[o+7] : p[o+6],
          e2:  has10 ? p[o+8] : p[o+7],
          e2t: has10 ? p[o+9] : (p[o+8] || ''),
        };
        if (hasLevel) entry.cefr = p[0].toUpperCase();
        db.dictionary.push(entry);
        added++;
      }
    });
    notify(`✅ ${added} kelime yüklendi`);
  } else {
    let added = 0;
    text.split('===YENİ===').forEach(part => {
      if (!part.trim()) return;
      const lines = part.trim().split('\n');
      const firstLine = lines[0].trim();
      const spaceIdx = firstLine.indexOf(' ');
      const level = firstLine.substring(0, spaceIdx);
      const title = firstLine.substring(spaceIdx + 1);
      const dashIdx = part.indexOf('---');
      const qIdx = part.indexOf('###SORULAR###');
      const questions = [];
      let currentQ = null;
      part.substring(qIdx + 13).split('\n').forEach(l => {
        const ln = l.trim();
        if (ln.startsWith('Q')) { if (currentQ) questions.push(currentQ); currentQ = { q:ln, A:'',B:'',C:'',D:'',correct:'' }; }
        else if (ln.startsWith('Correct:')) { currentQ.correct = ln.split(':')[1].trim(); }
        else if (ln.match(/^[A-D]\)/)) { currentQ[ln[0]] = ln.substring(2).trim(); }
      });
      if (currentQ) questions.push(currentQ);
      db.readings.push({ lvl: level, title, en: part.substring(part.indexOf('\n'), dashIdx).trim(), tr: part.substring(dashIdx + 3, qIdx).trim(), qs: questions });
      added++;
    });
    notify(`✅ ${added} stories loaded`);
  }
  save();
}

function handleFile(input, type) {
  const reader = new FileReader();
  reader.onload = e => {
    const text = e.target.result.trim();
    try {
      if (text.startsWith('[') || text.startsWith('{')) {
        // JSON formatı — normalizer kullan
        if (type === 'word') {
          const arr = parseJsonWords(text);
          if (arr.length === 0) { notify('❌ Kelime bulunamadı — format kontrol et'); return; }
          db.dictionary = arr;
          save();
          try { localStorage.setItem(DICT_CACHE_KEY, JSON.stringify(arr)); } catch(e) {}
          updateLoadStatus();
          notify(`✅ ${arr.length} kelime yüklendi`);
        } else {
          const arr = parseJsonReadings(text);
          if (arr.length === 0) { notify('❌ Okuma metni bulunamadı — format kontrol et'); return; }
          db.readings = arr;
          save();
          try { localStorage.setItem(READ_CACHE_KEY, JSON.stringify(arr)); } catch(e) {}
          updateLoadStatus();
          notify(`✅ ${arr.length} okuma metni yüklendi`);
        }
      } else {
        // Eski pipe/blok format
        processInput(text, type);
        updateLoadStatus();
      }
    } catch(err) {
      notify('❌ Dosya okunamadı: ' + err.message);
      console.error(err);
    }
  };
  reader.readAsText(input.files[0]);
  input.value = '';
}

function updateLoadStatus() {
  const ws = document.getElementById('wordLoadStatus');
  const rs = document.getElementById('readLoadStatus');
  const ss = document.getElementById('sinLoadStatus');
  const jsDict = (typeof KELIMELER !== 'undefined' && KELIMELER.length > 0) || (typeof WORD_DATA !== 'undefined' && WORD_DATA.length > 0);
  const jsRead = (typeof READINGS !== 'undefined' && READINGS.length > 0) || (typeof READING_DATA !== 'undefined' && READING_DATA);
  const jsSin  = (typeof sinavlarVerisi !== 'undefined' && sinavlarVerisi.length > 0);
  const dictSrc = jsDict ? 'kelimeler.js' : (localStorage.getItem(DICT_CACHE_KEY) ? 'önbellekten' : '');
  const readSrc = jsRead ? 'reading.js'   : (localStorage.getItem(READ_CACHE_KEY)  ? 'önbellekten' : '');
  const sinCnt  = jsSin  ? sinavlarVerisi.length : 0;
  const ok  = c => '<span style="color:#16a34a;font-weight:600;">' + c + '</span>';
  const err = c => '<span style="color:#ef4444;font-weight:600;">' + c + '</span>';
  const src = s => '<span style="color:var(--muted);margin-left:5px;font-size:.7rem;">(' + s + ')</span>';
  if (ws) ws.innerHTML = db.dictionary.length > 0
    ? ok('✅ ' + db.dictionary.length + ' kelime yüklü') + (dictSrc ? src(dictSrc) : '')
    : err('⚠️ Yüklü değil — 🔄 veya 📂 kullanın');
  if (rs) rs.innerHTML = db.readings.length > 0
    ? ok('✅ ' + db.readings.length + ' metin yüklü') + (readSrc ? src(readSrc) : '')
    : err('⚠️ Yüklü değil — 🔄 veya 📂 kullanın');
  if (ss) ss.innerHTML = sinCnt > 0
    ? ok('✅ ' + sinCnt + ' sınav yüklü') + src('sinavlar.js')
    : err('⚠️ Yüklü değil — 🔄 veya 📂 kullanın');
}
function handlePaste(type) {
  const el = document.getElementById(type === 'word' ? 'wordPaste' : 'readPaste');
  processInput(el.value, type);
  el.value = '';
}

// ---- FLASHCARDS ----
let cardIdx = 0, isEngMode = true, activeR = null;
let cardSource = 'unknown'; // 'unknown' | 'dict'
let cardList = []; // aktif kart listesi

function openCards() {
  if (db.unknown.length === 0) { notify('Hikayeleri oku ve kelimelere dokun! 📖'); return; }
  
  // Sözlük yüklüyse, kasadaki eksik (?) kelimeleri otomatik güncelle
  let enriched = 0;
  if (db.dictionary.length > 0) {
    db.unknown.forEach(u => {
      if (u.tr === '?' || !u.tr) {
        const match = db.dictionary.find(x => x.w === u.w);
        if (match) { Object.assign(u, match); enriched++; }
      }
    });
    if (enriched > 0) { save(); notify(`✨ ${enriched} kelime sözlükten güncellendi`); }
  }

  cardSource = 'unknown';
  cardList = db.unknown;
  cardIdx = 0; isEngMode = true;
  const lbl = document.getElementById('cardModeLabel');
  if (lbl) lbl.textContent = '📌 Bilinmeyen Kelimeler Kasası — ' + cardList.length + ' kelime';
  show('cardScreen');
  renderCard();
}

function openDictCards() {
  if (db.dictionary.length === 0) { notify('Önce Ayarlar\'dan kelime yükleyin! 📂'); return; }
  cardSource = 'dict';

  const CEFR_ORDER = ['A1','A2','B1','B2','C1','C2'];
  const currentCefr = getLvlConfig(db.lvl).cefr; // örn: "B1"
  const currentIdx  = CEFR_ORDER.indexOf(currentCefr);
  const TOTAL = Math.min(30, db.dictionary.length);
  const shuffle = arr => [...arr].sort(() => Math.random() - .5);

  // Seviye alanı olan kelime var mı?
  const hasCefrField = db.dictionary.some(w => w.cefr || w.level);

  let pool;
  if (hasCefrField) {
    // Kullanıcının seviyesi VE alt seviyelerindeki tüm kelimeler
    pool = db.dictionary.filter(w => {
      const wCefr = (w.cefr || w.level || '').toUpperCase();
      const wIdx  = CEFR_ORDER.indexOf(wCefr);
      return wIdx >= 0 && wIdx <= currentIdx;
    });
  } else {
    // Seviye alanı yoksa tüm sözlük
    pool = db.dictionary.slice();
  }

  cardList = shuffle(pool).slice(0, TOTAL);
  if (cardList.length === 0) {
    cardList = shuffle(db.dictionary).slice(0, TOTAL);
  }

  cardIdx = 0; isEngMode = true;
  const lbl = document.getElementById('cardModeLabel');
  const levelLabel = hasCefrField
    ? `${currentCefr} ve altı — ${cardList.length} kelime`
    : `${cardList.length} kelime`;
  if (lbl) lbl.textContent = `📚 ${levelLabel}`;
  show('cardScreen');
  renderCard();
}

// ---- PRONUNCIATION ----
function speakWord(text, lang) {
  if (!text || text === '—' || text === '?') return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = lang || 'en-US';
  utt.rate = 0.85;
  utt.pitch = 1;

  // Butonu speaking moduna al
  const btn = document.getElementById('speakFront');
  if (btn) { btn.classList.add('speaking'); btn.textContent = '🔊 ...'; }
  utt.onend = () => {
    if (btn) { btn.classList.remove('speaking'); btn.innerHTML = '🔊 Telaffuz'; }
  };
  utt.onerror = () => {
    if (btn) { btn.classList.remove('speaking'); btn.innerHTML = '🔊 Telaffuz'; }
  };
  window.speechSynthesis.speak(utt);
}

// Kart çevirme — hoparlör butonuna basıldığında kartı çevirme
function handleCardClick(e, box) {
  // speak-btn veya speak-btn-back'e tıklandıysa çevirme
  if (e.target.closest('.speak-btn') || e.target.closest('.speak-btn-back')) return;
  box.querySelector('.card-inner').classList.toggle('flipped');
}

function renderCard() {
  document.getElementById('cardProgress').innerText = `${cardIdx + 1} / ${cardList.length}`;
  const w = cardList[cardIdx];
  const cont = document.getElementById('cardContainer');
  const trHint = (w.tr && w.tr !== '?') ? w.tr : '';
  const teHint = (w.te && w.te !== '?') ? w.te : '';
  cont.innerHTML = `
    <div class="card-box" onclick="handleCardClick(event, this)">
      <div class="card-inner">
        <div class="card-face card-front">
          <div style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:10px;">
            ${isEngMode ? 'English → Turkish' : 'Türkçe Mod'}
          </div>
          <div class="card-word">${w.w}</div>
          ${teHint ? `<div style="font-size:.72rem;color:var(--muted);margin-top:4px;font-style:italic;">${teHint}</div>` : ''}

          <!-- Türkçe anlam: küçük buton, kart içinde -->
          <div style="margin-top:10px;">
            <div class="tr-reveal-wrap" id="trRevealWrap">
              <button class="tr-reveal-btn" id="trRevealBtn" onclick="event.stopPropagation(); revealTranslation()">
                👁 Anlamı gör
              </button>
              <div class="tr-reveal-text" id="trRevealText" style="display:none;">
                ${trHint || '—'}
              </div>
            </div>
          </div>

          <div style="width:40px;height:2px;background:var(--lvl-main);opacity:.4;border-radius:2px;margin:14px 0 6px;"></div>
          <button class="speak-btn" id="speakFront" onclick="event.stopPropagation(); speakWord('${w.w}', 'en-US')">
            🔊 Telaffuz
          </button>
          <div class="card-hint" style="margin-top:8px;">Detay için kartı çevir 👆</div>
        </div>
        <div class="card-face card-back" id="cardBack"></div>
      </div>
    </div>`;
  updateCardContent();
}

function revealTranslation() {
  const btn  = document.getElementById('trRevealBtn');
  const text = document.getElementById('trRevealText');
  if (!btn || !text) return;
  btn.style.display  = 'none';
  text.style.display = 'block';
}

function updateCardContent() {
  let w = cardList[cardIdx];
  
  // Anlık zenginleştirme: ? varsa sözlükten güncelle
  if (w && (w.tr === '?' || !w.tr) && db.dictionary.length > 0) {
    const match = db.dictionary.find(x => x.w === w.w);
    if (match) {
      Object.assign(w, match);
      if (cardSource === 'unknown') save();
    }
  }
  
  // ? değerleri kullanıcıya gösterme — yerine "—" koy
  const val = (v) => (!v || v === '?') ? '—' : v;

  const back = document.getElementById('cardBack');

  const langToggleBtn = `
    <button onclick="event.stopPropagation(); toggleCardLang()"
      style="display:block;width:calc(100% - 28px);margin:10px 14px 4px;padding:8px 0;
             background:linear-gradient(135deg,var(--lvl-main),var(--lvl-dark));
             color:#fff;border:none;border-radius:10px;font-size:.8rem;font-weight:700;
             cursor:pointer;letter-spacing:.5px;font-family:'DM Sans',sans-serif;">
      ⇄ ${isEngMode ? 'Türkçe Moda Geç' : 'English Mode\'a Geç'}
    </button>`;

  if (isEngMode) {
    back.innerHTML = `
      <div class="card-back-header">
        <div class="card-translation">${val(w.tr)}</div>
        <button class="speak-btn-back" onclick="speakWord('${w.w}', 'en-US')">🔊 ${w.w}</button>
      </div>
      <div class="card-back-body">
        <div class="card-row">
          <div class="card-row-label">📌 Type</div>
          <div class="card-row-text" style="font-weight:700;color:var(--lvl-dark);">${val(w.te)}</div>
        </div>
        <div class="card-row">
          <div class="card-row-label">📖 Definition</div>
          <div class="card-row-text">${val(w.de)}</div>
        </div>
        <div class="card-row">
          <div class="card-row-label">💬 Example 1</div>
          <div class="card-row-text" style="font-style:italic;">${val(w.e1)}</div>
        </div>
        <div class="card-row" style="border-bottom:none;">
          <div class="card-row-label">💬 Example 2</div>
          <div class="card-row-text" style="font-style:italic;">${val(w.e2)}</div>
        </div>
      </div>
      ${langToggleBtn}`;
  } else {
    back.innerHTML = `
      <div class="card-back-header" style="background:linear-gradient(135deg,#d97706,#92400e);">
        <div class="card-translation">${val(w.tr)}</div>
        <button class="speak-btn-back" onclick="speakWord('${w.w}', 'en-US')">🔊 ${w.w}</button>
      </div>
      <div class="card-back-body">
        <div class="card-row">
          <div class="card-row-label">📌 Tür</div>
          <div class="card-row-text" style="font-weight:700;color:#d97706;">${val(w.tt)}</div>
        </div>
        <div class="card-row">
          <div class="card-row-label">📖 Tanım</div>
          <div class="card-row-text">${val(w.dt)}</div>
        </div>
        <div class="card-row">
          <div class="card-row-label">💬 Örnek 1</div>
          <div class="card-row-text" style="font-style:italic;">${val(w.e1t)}</div>
        </div>
        <div class="card-row" style="border-bottom:none;">
          <div class="card-row-label">💬 Örnek 2</div>
          <div class="card-row-text" style="font-style:italic;">${val(w.e2t)}</div>
        </div>
      </div>
      ${langToggleBtn}`;
  }
}

function toggleCardLang() {
  isEngMode = !isEngMode;
  // Update front face mode label too
  const front = document.querySelector('.card-front div:first-child');
  if (front) front.innerText = isEngMode ? 'English → Turkish' : 'Türkçe Mod';
  updateCardContent();
}

function cardAction(type) {
  if (cardSource === 'unknown') {
    // Kelime kasası: "Biliyorum" kaldırır, "Tekrar" devam eder
    if (type === 'know') {
      // V15: Günlük hedef takibi
      db.todayWords = (db.todayWords || 0) + 1;
      db.stats.learnedWords = (db.stats.learnedWords || 0) + 1;
      save();
      updateDailyGoalWidget();
      const goal = db.profile?.goal || 10;
      if (db.todayWords === goal) {
        setTimeout(() => { launchConfetti(); notify('🎉 Günlük kelime hedefe ulaştın!'); }, 400);
      }
      db.unknown.splice(cardIdx, 1);
      cardList = db.unknown;
      save();
    } else {
      cardIdx = (cardIdx + 1) % cardList.length;
    }
    if (cardList.length > 0) {
      if (cardIdx >= cardList.length) cardIdx = 0;
      renderCard();
    } else {
      show('home');
      notify('🎉 Tüm kelimeler öğrenildi!');
    }
  } else {
    // Sözlük modu: sadece ileri/geri, kelime silinmez
    // V16: Sözlük çalışmasında da günlük hedefe say
    if (type === 'know') {
      db.todayWords = (db.todayWords || 0) + 1;
      save();
      updateDailyGoalWidget();
      const goal = db.profile?.goal || 10;
      if (db.todayWords === goal) {
        setTimeout(() => { launchConfetti(); notify('🎉 Günlük hedefe ulaştın!'); }, 400);
      }
    }
    if (cardIdx < cardList.length - 1) {
      cardIdx++;
      renderCard();
    } else {
      notify('🎉 Tur tamamlandı! Tekrar başlıyoruz...');
      cardIdx = 0;
      renderCard();
    }
  }
}

// ---- QUIZ ----
let userAnswers = [], qCounter = 0, qScore = 0;

function startQuiz() {
  if (!activeR || !activeR.qs || activeR.qs.length === 0) {
    notify('No questions for this story.');
    return;
  }
  qCounter = 0; qScore = 0; userAnswers = [];
  show('quizScreen');
  renderQuestion();
}

function renderQuestion() {
  if (qCounter >= activeR.qs.length) { finishQuiz(); return; }
  const q = activeR.qs[qCounter];
  const total = activeR.qs.length;

  document.getElementById('quizProgress').innerText = `${qCounter+1} / ${total}`;
  document.getElementById('qBar').style.width = `${((qCounter)/total)*100}%`;

  // Soru metnini interaktif kelime span'larıyla oluştur
  const qTextEl = document.getElementById('qText');
  qTextEl.innerHTML = '';
  q.q.split(/\s+/).forEach(rawWord => {
    const span = document.createElement('span');
    span.className = 'word-span';
    const clean = rawWord.toLowerCase().replace(/[^a-z]/g, '');
    const dictMatch = clean ? findDictWord(rawWord) : null;

    if (dictMatch && dictMatch.tr && dictMatch.tr !== '?') {
      const tip = document.createElement('span');
      tip.className = 'word-tooltip';
      tip.innerText = dictMatch.tr;
      span.appendChild(tip);
    }
    span.appendChild(document.createTextNode(rawWord + ' '));

    if (clean && db.unknown.find(u => u.w === clean)) span.classList.add('is-unknown');
    span.onclick = () => {
      if (!clean) return;
      const idx = db.unknown.findIndex(u => u.w === clean);
      if (idx === -1) {
        db.unknown.push(dictMatch ? {...dictMatch} : { w:clean, tr:'?', te:'?', tt:'?', de:'?', dt:'?', e1:'?', e1t:'?', e2:'?', e2t:'?' });
        span.classList.add('is-unknown');
        save();
        const meaning = dictMatch ? ` (${dictMatch.tr})` : '';
        notify(`"${clean}"${meaning} → Kasaya eklendi 📚`);
      } else {
        db.unknown.splice(idx, 1);
        span.classList.remove('is-unknown');
        save();
        notify(`"${clean}" → Kasadan çıkarıldı 🗑️`);
      }
    };
    qTextEl.appendChild(span);
  });

  const cont = document.getElementById('qOptions');
  cont.innerHTML = '';
  let locked = false;

  ['A','B','C','D'].forEach(o => {
    if (!q[o]) return;
    const btn = document.createElement('button');
    btn.className = 'q-option';
    btn.innerText = `${o}) ${q[o]}`;
    btn.onclick = () => {
      if (locked) return;
      locked = true;
      userAnswers.push({ question:q.q, selected:o, correct:q.correct, qObj: q });
      if (o === q.correct) qScore++;
      [...cont.children].forEach(b => {
        const letter = b.innerText[0];
        if (letter === q.correct) b.classList.add('correct');
        if (letter === o && o !== q.correct) b.classList.add('wrong');
        b.style.pointerEvents = 'none';
      });
      setTimeout(() => { qCounter++; renderQuestion(); }, 900);
    };
    cont.appendChild(btn);
  });
}

function finishQuiz() {
  const total = activeR.qs.length;
  const correct = qScore;
  const wrong = total - correct;
  const perc = total > 0 ? Math.round((correct / total) * 100) : 0;

  db.stats.correct = (db.stats.correct||0) + correct;
  db.stats.total   = (db.stats.total||0) + total;
  // Sadece ilk tamamlanmada todayRead artır
  if (!db.stats.completed[activeR.title]) {
    db.todayRead = (db.todayRead || 0) + 1;
  }
  db.stats.completed[activeR.title] = true;
  markToday();
  save();
  updateDailyGoalWidget();

  // Hero kısmı
  document.getElementById('resPercent').innerText = `${perc}%`;
  document.getElementById('resEmoji').innerText =
    perc === 100 ? '🏆' : perc >= 80 ? '🎯' : perc >= 60 ? '💪' : '☹️';
  const L = db.lang;
  document.getElementById('resMsg').innerText = perc >= 70 ? i18n[L].wellDone : i18n[L].notYet;
  document.getElementById('resCorrectNum').innerText = correct;
  document.getElementById('resWrongNum').innerText   = wrong;
  document.getElementById('resTotalNum').innerText   = total;

  // Soru analizi — her soru için detaylı kart
  const detail = document.getElementById('resDetail');
  detail.innerHTML = '';

  userAnswers.forEach((a, i) => {
    const isCorrect = a.selected === a.correct;
    const q = a.qObj || activeR.qs[i]; // tam soru objesi (A/B/C/D metinleri için)

    const card = document.createElement('div');
    card.className = `ans-card ${isCorrect ? 'correct-card' : 'wrong-card'}`;

    // Soru başlığı
    const header = document.createElement('div');
    header.className = 'ans-card-header';
    header.innerHTML = `
      <span class="ans-badge">${isCorrect ? '✅' : '❌'}</span>
      <span class="ans-question">${i+1}. ${q ? q.q : a.question}</span>`;
    card.appendChild(header);

    // Cevap detayları
    const body = document.createElement('div');
    body.className = 'ans-card-body';

    if (!isCorrect) {
      // Yanlış cevap: kullanıcının seçtiği + doğru cevap göster
      const userOptText = q && q[a.selected] ? `${a.selected}) ${q[a.selected]}` : a.selected;
      const corrOptText = q && q[a.correct]   ? `${a.correct}) ${q[a.correct]}`   : a.correct;

      body.innerHTML = `
        <div class="ans-row user-wrong">
          <span class="ans-row-lbl">Cevabın</span>
          <span>${userOptText}</span>
        </div>
        <div class="ans-row show-correct">
          <span class="ans-row-lbl">Doğrusu</span>
          <span>${corrOptText}</span>
        </div>`;
    } else {
      // Doğru cevap: sadece seçilen cevabı göster
      const corrOptText = q && q[a.correct] ? `${a.correct}) ${q[a.correct]}` : a.correct;
      body.innerHTML = `
        <div class="ans-row user-correct">
          <span class="ans-row-lbl">Cevabın</span>
          <span>${corrOptText}</span>
        </div>`;
    }

    card.appendChild(body);
    detail.appendChild(card);
  });

  show('resultScreen');
  // V15: Confetti for perfect score
  const _perc = activeR.qs.length > 0 ? Math.round((qScore / activeR.qs.length) * 100) : 0;
  if (_perc === 100) setTimeout(launchConfetti, 400);
}

// ---- STATS ----
function showStats() {
  show('stats');

  // Chart kaldırıldı (4. düzeltme)

  // Calculate all stats
  const totalReadings    = db.readings.length;
  const completedAll     = db.readings.filter(r => db.stats.completed[r.title]).length;
  const quizTotal        = db.stats.total || 0;
  const quizCorrect      = db.stats.correct || 0;
  const quizAccuracy     = quizTotal > 0 ? Math.round((quizCorrect / quizTotal) * 100) : 0;
  const vocabLearned     = db.stats.learnedWords || 0;
  const listenCount      = db.stats.listenCount || 0;
  const streak           = streakCount();
  const weekDays         = Object.keys(db.weekActivity).length;

  // 4-tile grid
  const tilesHTML = `
    <div class="stats-grid">
      <div class="stat-tile" style="--tile-color:#22c55e;">
        <span class="stat-tile-icon">📖</span>
        <div class="stat-tile-value">${completedAll}</div>
        <div class="stat-tile-label">Tamamlanan<br>Metin</div>
      </div>
      <div class="stat-tile" style="--tile-color:#3b82f6;">
        <span class="stat-tile-icon">🎯</span>
        <div class="stat-tile-value">${quizAccuracy}%</div>
        <div class="stat-tile-label">Quiz<br>Başarısı</div>
      </div>
      <div class="stat-tile" style="--tile-color:#a78bfa;">
        <span class="stat-tile-icon">🧠</span>
        <div class="stat-tile-value">${vocabLearned}</div>
        <div class="stat-tile-label">Öğrenilen<br>Kelime</div>
      </div>
      <div class="stat-tile" style="--tile-color:#f59e0b;">
        <span class="stat-tile-icon">🔥</span>
        <div class="stat-tile-value">${streak}</div>
        <div class="stat-tile-label">Gün<br>Serisi</div>
      </div>
      <div class="stat-tile" style="--tile-color:#06b6d4;">
        <span class="stat-tile-icon">🎧</span>
        <div class="stat-tile-value">${listenCount}</div>
        <div class="stat-tile-label">Dinleme<br>Sayısı</div>
      </div>
    </div>`;

  // Quiz detail row
  const quizDetailHTML = `
    <div class="stat-card" style="margin-top:18px;">
      <div style="font-weight:700;font-size:.9rem;margin-bottom:12px;opacity:.9;">📊 Quiz Detayları</div>
      <div class="stat-row"><span>Toplam Soru</span><span><b>${quizTotal}</b></span></div>
      <div class="stat-row"><span>Doğru Cevap</span><span><b>${quizCorrect}</b></span></div>
      <div class="stat-row"><span>Yanlış Cevap</span><span><b>${quizTotal - quizCorrect}</b></span></div>
      <div class="stat-row"><span>Toplam Metin</span><span><b>${completedAll} / ${totalReadings}</b></span></div>
      <div class="stat-row"><span>Aktif Gün (toplam)</span><span><b>${weekDays}</b></span></div>
    </div>`;

  // Level breakdown
  const maxCompleted = Math.max(...LEVELS.map(l =>
    db.readings.filter(r => (r.lvl===l.cefr||r.lvl===l.id) && db.stats.completed[r.title]).length
  ), 1);

  let levelRowsHTML = '';
  LEVELS.forEach(l => {
    const total = db.readings.filter(r => r.lvl === l.cefr || r.lvl === l.id).length;
    const done  = db.readings.filter(r => (r.lvl===l.cefr||r.lvl===l.id) && db.stats.completed[r.title]).length;
    const pct   = total > 0 ? Math.round((done/total)*100) : 0;
    levelRowsHTML += `
      <div class="level-breakdown-row">
        <span class="lvl-icon-small">${l.icon}</span>
        <span class="lvl-name-small">${l.id} <span style="color:var(--muted);font-weight:400;">(${l.cefr})</span></span>
        <div class="lvl-progress-bar">
          <div class="lvl-progress-fill" style="width:${pct}%;background:${l.color};"></div>
        </div>
        <span class="lvl-count-small">${done}/${total}</span>
      </div>`;
  });

  const levelBreakdownHTML = `
    <div class="level-breakdown">
      <div class="level-breakdown-title">📚 Seviye Bazlı İlerleme</div>
      ${levelRowsHTML}
    </div>`;

  document.getElementById('statsInfo').innerHTML = tilesHTML + quizDetailHTML + levelBreakdownHTML;

  // Show share button only if Web Share API available
  const shareBtn = document.getElementById('shareStatsBtn');
  if (shareBtn) shareBtn.style.display = navigator.share ? 'block' : 'none';

  // Store stats for share function
  window._lastStats = { completedAll, totalReadings, quizAccuracy, vocabLearned, streak };
}

// ---- WEB SHARE API ----
async function shareStats() {
  const s = window._lastStats || {};
  const lvl = getLvlConfig(db.lvl);
  const user = getCurrentUser();
  const name = user?.name || db.profile?.name || 'Ben';
  const text =
    `🌍 ${name} LinguiVance'da öğrenmeye devam ediyor!\n\n` +
    `📖 ${s.completedAll || 0} metin tamamlandı\n` +
    `🧠 ${s.vocabLearned || 0} kelime öğrenildi\n` +
    `🎯 %${s.quizAccuracy || 0} quiz başarısı\n` +
    `🔥 ${s.streak || 0} günlük seri\n` +
    `${lvl.icon} Seviye: ${lvl.id} (${lvl.cefr})\n\n` +
    `#LinguiVance #EnglishLearning`;

  try {
    await navigator.share({ title: 'LinguiVance İlerlemem', text });
  } catch (e) {
    if (e.name !== 'AbortError') notify('Paylaşım desteklenmiyor.');
  }
}

// ---- AUDIO ----
let synth = window.speechSynthesis, isPlaying = false;

// TTS modül-seviyesi durum — pause/resume güvenilirliği için
let ttsSegs = [], ttsSegIdx = 0, ttsWi = 0, ttsSpd = 1, ttsGen = 0;
// Timer tabanlı highlight (onboundary desteklemeyen tarayıcılar için)
let _hlTimers = [];
function _clearHlTimers() { _hlTimers.forEach(clearTimeout); _hlTimers = []; }

function highlightWord(idx) {
  document.querySelectorAll('#readArea .is-speaking').forEach(el => el.classList.remove('is-speaking'));
  if (idx === null) return;
  const span = document.querySelector(`#readArea [data-wi="${idx}"]`);
  if (!span) return;
  span.classList.add('is-speaking');
  span.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function _ttsSpeakNext(gen) {
  if (gen !== ttsGen || !isPlaying) return;
  if (ttsSegIdx >= ttsSegs.length) {
    // Bitti — tam dinleme tamamlandı
    highlightWord(null); isPlaying = false;
    const btn = document.getElementById('pauseBtn');
    if (btn) { btn.title = 'Duraklat'; btn.textContent = '⏸'; }
    // Dinleme sayacını artır (sadece baştan sona tamamlanmış sayılır)
    db.stats.listenCount = (db.stats.listenCount || 0) + 1;
    db.todayListen = (db.todayListen || 0) + 1;
    save();
    updateDailyGoalWidget();
    return;
  }
  const seg = ttsSegs[ttsSegIdx];
  const u   = new SpeechSynthesisUtterance(seg.text);
  u.rate = ttsSpd; u.lang = 'en-US';
  const startWi = ttsWi;
  let lWi = 0;
  let _boundaryFired = false; // onboundary çalışıyorsa timer'ı iptal et

  // onstart: timer tabanlı kelime-kelime highlight (onboundary olmayan tarayıcılar için)
  u.onstart = () => {
    if (gen !== ttsGen) return;
    _clearHlTimers();
    _boundaryFired = false;
    // Her kelime için yaklaşık süre (280ms / 1x hız, hız arttıkça azalır)
    const msPerWord = Math.max(80, Math.round(280 / ttsSpd));
    for (let i = 0; i < seg.wordCount; i++) {
      const wi = startWi + i;
      const t = setTimeout(() => {
        if (gen !== ttsGen || _boundaryFired) return;
        highlightWord(wi);
      }, i * msPerWord);
      _hlTimers.push(t);
    }
  };

  // onboundary: Chrome/Edge'de kelime sınırında tetiklenir → timer'ı iptal et, gerçek zamanlı yap
  u.onboundary = e => {
    if (gen !== ttsGen) return;
    if (e.name === 'word') {
      if (!_boundaryFired) {
        _boundaryFired = true;
        _clearHlTimers(); // Timer fallback artık gerekli değil
      }
      highlightWord(startWi + lWi);
      lWi++;
    }
  };

  u.onend = () => {
    if (gen !== ttsGen) return;
    ttsWi += seg.wordCount; ttsSegIdx++;
    if (!isPlaying) { highlightWord(null); return; }
    seg.pause > 0
      ? setTimeout(() => _ttsSpeakNext(gen), Math.round(seg.pause / ttsSpd))
      : _ttsSpeakNext(gen);
  };

  // Hata (genellikle synth.cancel() sonrası tetiklenir) — eski gen ise yoksay
  u.onerror = () => { if (gen !== ttsGen) return; highlightWord(null); isPlaying = false; };

  synth.speak(u);
}

function playS() {
  if (readLangMode === 'TR') { notify('Ses sadece İngilizce modda çalışır'); return; }
  ttsGen++; synth.cancel(); isPlaying = true;
  ttsSpd = parseFloat(document.getElementById('speed').value);
  const lines    = (activeR?.en || '').trim().split('\n');
  const fullText = lines.length > 1 ? lines.slice(1).join(' ') : (lines[0] || '');

  // Metni segmentlere böl (nokta/virgül sınırları)
  ttsSegs = []; let cur = '';
  fullText.split(/([,\.])/).forEach(part => {
    if (part === ',' || part === '.') { if (cur.trim()) ttsSegs.push({ text: cur.trim(), pause: part === '.' ? 300 : 125 }); cur = ''; }
    else cur += part;
  });
  if (cur.trim()) ttsSegs.push({ text: cur.trim(), pause: 0 });
  ttsSegs.forEach(s => { s.wordCount = s.text.split(/\s+/).filter(w => w.trim()).length; });

  ttsSegIdx = 0; ttsWi = 0;
  const btn = document.getElementById('pauseBtn');
  if (btn) { btn.title = 'Duraklat'; btn.textContent = '⏸'; }
  _ttsSpeakNext(ttsGen);
}

function pauseToggleS() {
  const btn = document.getElementById('pauseBtn');
  if (isPlaying) {
    // Çalıyor → duraklat (segIdx sakla)
    isPlaying = false;
    _clearHlTimers();
    ttsGen++; synth.cancel(); // mevcut utterance'ı durdur, eski gen geçersiz olur
    document.querySelectorAll('#readArea .is-speaking').forEach(el => el.classList.remove('is-speaking'));
    if (btn) { btn.title = 'Devam Et'; btn.textContent = '▶'; }
  } else if (ttsSegs.length > 0 && ttsSegIdx < ttsSegs.length) {
    // Duraklatılmış → kaldığı yerden devam et
    isPlaying = true;
    const gen = ++ttsGen;
    if (btn) { btn.title = 'Duraklat'; btn.textContent = '⏸'; }
    _ttsSpeakNext(gen);
  } else {
    // Hiç başlamamış → baştan
    playS();
  }
}
function pauseS()  { pauseToggleS(); }
function resumeS() { if (!isPlaying) pauseToggleS(); }

function stopS() {
  isPlaying = false; ttsSegIdx = 0; ttsWi = 0; ttsSegs = [];
  _clearHlTimers();
  ttsGen++; synth.cancel();
  document.querySelectorAll('#readArea .is-speaking').forEach(el => el.classList.remove('is-speaking'));
  const btn = document.getElementById('pauseBtn');
  if (btn) { btn.title = 'Duraklat'; btn.textContent = '⏸'; }
}

let readDarkMode = false;
function toggleReadDark() {
  readDarkMode = !readDarkMode;
  const screen = document.getElementById('readMod');
  const btn = document.getElementById('readDarkBtn');
  screen.classList.toggle('read-dark', readDarkMode);
  btn.textContent = readDarkMode ? '☀️' : '🌙';
  // reading-body arka planını da güncelle
  const area = document.getElementById('readArea');
  area.style.background = readDarkMode ? '#0f0f1a' : '';
  area.style.color = readDarkMode ? '#e2d9c8' : '';
}

// ---- YAZI BOYUTU ----
let readFontSize = 1.0; // rem (başlangıç)
function _applyReadFont() {
  const area = document.getElementById('readArea');
  if (area) area.style.fontSize = readFontSize.toFixed(1) + 'rem';
}
function readFontBigger()  { readFontSize = Math.min(1.8, +(readFontSize + 0.1).toFixed(1)); _applyReadFont(); }
function readFontSmaller() { readFontSize = Math.max(0.7, +(readFontSize - 0.1).toFixed(1)); _applyReadFont(); }

function updateSpd() {
  const v = document.getElementById('speed').value;
  document.getElementById('speedVal').innerText = parseFloat(v).toFixed(1) + '×';
}

// ---- DATA VERIFICATION HELPERS ----
function checkData() {
  const el = document.getElementById('dataCheck');
  el.style.display = 'block';
  const wCount = db.dictionary.length;
  const rCount = db.readings.length;
  const uCount = db.unknown.length;
  let html = `Sözlük: ${wCount} kelime | Metinler: ${rCount} | Kasa: ${uCount}\n\n`;
  if (wCount > 0) {
    const w = db.dictionary[0];
    html += `İlk kelime:\nw="${w.w}" | tr="${w.tr}"\nte="${w.te}" | tt="${w.tt}"\nde="${w.de}"\ndt="${w.dt}"\ne1="${w.e1}"\ne1t="${w.e1t}"\ne2="${w.e2}"\ne2t="${w.e2t}"`;
  } else { html += 'Sözlük boş — Ayarlardan kelime yükleyin.'; }
  el.innerText = html;
}

function testWordCard() {
  if (db.dictionary.length === 0) { notify('Önce kelime yükleyin!'); return; }
  const w = db.dictionary[0];
  cardSource = 'dict';
  cardList = [w];
  cardIdx = 0; isEngMode = true;
  const lbl = document.getElementById('cardModeLabel');
  if (lbl) lbl.textContent = '🔍 Test Kartı';
  show('cardScreen');
  renderCard();
}

// ---- EXPORT / IMPORT ----
function exportJSON() {
  const now = new Date();
  const ts = now.toISOString().replace(/[:.]/g,'-').slice(0,19);
  const blob = new Blob([JSON.stringify(db, null, 2)], { type:'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `linguivance_yedek_${ts}.json`;
  a.click();
  notify(`📥 Yedek alındı: ${ts}`);
}
function importJSON(input) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      db = JSON.parse(e.target.result);
      save();
      location.reload();
    } catch { notify('❌ Invalid backup file'); }
  };
  reader.readAsText(input.files[0]);
}
function resetAllLegacy() {
  if (confirm('Reset ALL data? This cannot be undone!')) {
    localStorage.clear();
    location.reload();
  }
}

// ---- INIT ----
load();

// ---- VERİ BAŞLATMA (kelimeler.js + reading.js + sinavlar.js + localStorage cache) ----
// Öncelik: 1) JS dosyası (herhangi bir değişken adı)  2) localStorage cache  3) boş
function injectBuiltinData() {
  // ---- KELIMELER (WORD_DATA veya KELIMELER) ----
  try {
    const rawWords = (typeof KELIMELER   !== 'undefined' && Array.isArray(KELIMELER)   && KELIMELER.length   > 0) ? KELIMELER
                   : (typeof WORD_DATA   !== 'undefined' && Array.isArray(WORD_DATA)   && WORD_DATA.length   > 0) ? WORD_DATA
                   : null;
    if (rawWords) {
      const sample = rawWords[0];
      db.dictionary = sample.w ? rawWords : rawWords.map(normalizeWord).filter(w => w.w);
      try { localStorage.setItem(DICT_CACHE_KEY, JSON.stringify(db.dictionary)); } catch(e) {}
      console.log('✅ kelimeler.js: ' + db.dictionary.length + ' kelime');
    } else {
      const cached = JSON.parse(localStorage.getItem(DICT_CACHE_KEY) || 'null');
      if (cached && cached.length > 0) { db.dictionary = cached; console.log('✅ kelimeler cache: ' + db.dictionary.length); }
      else console.warn('⚠️ Kelime verisi yok (KELIMELER/WORD_DATA undefined, cache yok)');
    }
  } catch(e) { console.error('❌ injectBuiltinData kelime hatası:', e); }

  // ---- READINGS (READING_DATA.reading_data veya READINGS) ----
  try {
    const rawReads = (typeof READINGS      !== 'undefined' && Array.isArray(READINGS)             && READINGS.length      > 0) ? READINGS
                   : (typeof READING_DATA  !== 'undefined' && READING_DATA && Array.isArray(READING_DATA.reading_data)) ? READING_DATA.reading_data
                   : null;
    if (rawReads) {
      const sample = rawReads[0];
      db.readings = (sample.en && sample.qs) ? rawReads : rawReads.map(normalizeReading).filter(r => r.title);
      try { localStorage.setItem(READ_CACHE_KEY, JSON.stringify(db.readings)); } catch(e) {}
      console.log('✅ reading.js: ' + db.readings.length + ' metin');
    } else {
      const cached = JSON.parse(localStorage.getItem(READ_CACHE_KEY) || 'null');
      if (cached && cached.length > 0) { db.readings = cached; console.log('✅ readings cache: ' + db.readings.length); }
      else console.warn('⚠️ Reading verisi yok (READINGS/READING_DATA undefined, cache yok)');
    }
  } catch(e) { console.error('❌ injectBuiltinData reading hatası:', e); }

  // ---- SINAVLAR (sinavlarVerisi) ----
  try {
    if (typeof sinavlarVerisi !== 'undefined' && Array.isArray(sinavlarVerisi) && sinavlarVerisi.length > 0) {
      if (typeof loadPlacementFromGlobal === 'function') loadPlacementFromGlobal();
      if (typeof loadGateFromGlobal === 'function') loadGateFromGlobal();
      console.log('✅ sinavlar.js: ' + sinavlarVerisi.length + ' sınav');
    }
  } catch(e) { console.error('❌ injectBuiltinData sınav hatası:', e); }
}
injectBuiltinData(); // İlk yükleme

// Admin "Yenile" butonu için: veriyi yeniden yükle → UI güncelle
function refreshBuiltinData() {
  injectBuiltinData();
  updateLoadStatus();
  if (typeof renderAdminDataInfo === 'function') renderAdminDataInfo();
  const sinCnt = (typeof sinavlarVerisi !== 'undefined') ? sinavlarVerisi.length : 0;
  notify('🔄 Yenilendi: ' + db.dictionary.length + ' kelime, ' + db.readings.length + ' metin, ' + sinCnt + ' sınav');
}
buildLevelGrid();
applyLevel(db.lvl);
applyLang();
updateHero();
buildWeekRow();

// Ensure body has data-level from the start
document.body.setAttribute('data-level', db.lvl);

/* ============================================================
   V15 — NEW FEATURES JS
   ============================================================ */

// ---- DB EXTENSIONS ----
// Ensure new fields exist on load
if (!db.profile) db.profile = { name: '', avatar: '😊', goal: 10 };
if (!db.settings) db.settings = { darkMode: false, notifications: false, sound: true };
if (db.onboardingDone === undefined) db.onboardingDone = false;
if (!db.profile.goal) db.profile.goal = 10;
if (!db.todayWords) db.todayWords = 0;
if (!db.todayDate) db.todayDate = '';
if (!db.stats.learnedWords) db.stats.learnedWords = 0;
if (!db.stats.listenCount) db.stats.listenCount = 0;
if (!db.todayRead) db.todayRead = 0;
if (!db.todayListen) db.todayListen = 0;

// Reset daily word count at new day
(function checkDailyReset() {
  const today = new Date().toISOString().slice(0,10);
  if (db.todayDate !== today) {
    db.todayWords = 0;
    db.todayRead = 0;
    db.todayListen = 0;
    db.todayDate = today;
    save();
  }
})();

// Apply saved settings
if (db.settings.darkMode) document.body.classList.add('dark-mode');
updateToggleUI();

/* ============================================================
   AUTH SYSTEM — sabitler yukarıda save() öncesinde tanımlandı
   ============================================================ */

function getAuthUsers()      { try { return JSON.parse(localStorage.getItem(AUTH_USERS_KEY) || '[]'); } catch(e) { return []; } }
function getAuthSession()    { return localStorage.getItem(AUTH_SESSION_KEY); }
function getCurrentUser()    { const uid = getAuthSession(); return getAuthUsers().find(u => u.id === uid) || null; }
function isAdminUser()       { const u = getCurrentUser(); return !!(u && u.isSuperAdmin); }
function isSuperAdminUser()  { const u = getCurrentUser(); return !!(u && u.isSuperAdmin); }

/* ---- SUPER ADMIN SEED ---- */
const SUPER_ADMIN_ID = 'sadmin-mehkutlu';
async function seedSuperAdmin() {
  const users = getAuthUsers();
  if (users.find(u => u.id === SUPER_ADMIN_ID)) return; // zaten var
  users.unshift({
    id: SUPER_ADMIN_ID,
    username: 'admin241',
    email: 'mehkutlu@gmail.com',
    name: 'Mehmet Kutlu',
    pw: 'f6a40d6166cef5dfe9af805241c622af9ee8c90a71a0375826c884559c89f415', // SHA-256(Mkutlu87654321)
    isAdmin: true,
    isSuperAdmin: true,
    createdAt: '2024-01-01T00:00:00.000Z'
  });
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
}

function checkAuth() {
  if (!getAuthSession()) {
    const el = document.getElementById('authScreen');
    el.style.display = 'flex';
    document.getElementById('onboarding').classList.remove('active');
    document.getElementById('tabBar').style.display = 'none';
  } else {
    applyAuthToUI();
    checkOnboarding();
  }
}

function applyAuthToUI() {
  const user = getCurrentUser();
  if (!user) return;
  const emailEl = document.getElementById('profileEmailDisplay');
  if (emailEl) emailEl.textContent = user.email;
  const badge = document.getElementById('profileAdminBadge');
  if (badge) badge.style.display = user.isSuperAdmin ? 'inline-block' : 'none';
  const ids = ['adminContentSection','adminDevSection','adminPanelBtn','profileDataMgmtBtn'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = user.isSuperAdmin ? '' : 'none';
  });
}

function authSwitchTab(tab) {
  document.getElementById('authFormLogin').classList.toggle('active', tab === 'login');
  document.getElementById('authFormReg').classList.toggle('active', tab === 'reg');
  const btnLogin = document.getElementById('authTabLogin');
  const btnReg   = document.getElementById('authTabReg');
  btnLogin.classList.toggle('active', tab === 'login');
  btnReg.classList.toggle('active',   tab === 'reg');
  btnLogin.setAttribute('aria-selected', tab === 'login' ? 'true' : 'false');
  btnReg.setAttribute('aria-selected',   tab === 'reg'   ? 'true' : 'false');
  document.getElementById('authErrLogin').style.display = 'none';
  document.getElementById('authErrReg').style.display = 'none';
}

function authShowErr(formId, msg) {
  const el = document.getElementById(formId);
  el.textContent = '⚠️ ' + msg;
  el.style.display = 'block';
}

/* SHA-256 hash via Web Crypto API (async, no external lib needed) */
async function hashPw(pw) {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(pw));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}


// ---- FORGOT PASSWORD ----
function showForgotPassword() {
  const email = prompt('Kayıtlı e-posta adresinizi girin:');
  if (!email) return;
  const users = getAuthUsers();
  const user = users.find(u => u.email === email.trim().toLowerCase());
  if (!user) {
    alert('Bu e-posta ile kayıtlı kullanıcı bulunamadı.');
    return;
  }
  const newPw = prompt(`"${user.name || user.email}" hesabı için yeni şifrenizi girin (en az 6 karakter):`);
  if (!newPw || newPw.length < 6) { alert('Geçersiz şifre. En az 6 karakter giriniz.'); return; }
  hashPw(newPw).then(hashed => {
    user.pw = hashed;
    localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
    alert('Şifreniz başarıyla güncellendi. Yeni şifrenizle giriş yapabilirsiniz.');
  });
}

async function authLogin() {
  const emailOrUser = (document.getElementById('authLoginEmail').value || '').trim().toLowerCase();
  const pw          = document.getElementById('authLoginPw').value;
  if (!emailOrUser || !pw) { authShowErr('authErrLogin', 'E-posta/kullanıcı adı ve şifreyi girin.'); return; }

  const hashed = await hashPw(pw);
  let users = getAuthUsers();
  // E-posta veya kullanıcı adıyla eşleştir
  const matchUser = u => u.email === emailOrUser || (u.username && u.username.toLowerCase() === emailOrUser);
  let user = users.find(u => matchUser(u) && u.pw === hashed);

  // Backward-compat: migrate old btoa-encoded passwords on first login
  if (!user) {
    try {
      const legacy = users.find(u => matchUser(u) && atob(u.pw) === pw);
      if (legacy) {
        const idx = users.findIndex(u => u.id === legacy.id);
        users[idx].pw = hashed; // upgrade to SHA-256
        localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
        user = users[idx];
      }
    } catch (_) { /* atob may throw on non-base64 pw — safe to ignore */ }
  }

  if (!user) { authShowErr('authErrLogin', 'E-posta/kullanıcı adı veya şifre hatalı.'); return; }
  localStorage.setItem(AUTH_SESSION_KEY, user.id);
  document.getElementById('authScreen').style.display = 'none';
  // Per-user onboarding: sync onboarding status from auth record
  db.onboardingDone = !!user.onboardingDone;
  if (!db.profile.name) { db.profile.name = user.name; db.profile.avatar = user.avatar || db.profile.avatar || '😊'; }
  save();
  applyAuthToUI();
  checkOnboarding();
}

async function authRegister() {
  const name  = (document.getElementById('authRegName').value  || '').trim();
  const email = (document.getElementById('authRegEmail').value || '').trim().toLowerCase();
  const pw    = document.getElementById('authRegPw').value;
  const pw2   = document.getElementById('authRegPw2').value;
  if (!name || !email || !pw || !pw2) { authShowErr('authErrReg', 'Tüm alanları doldurun.'); return; }
  if (pw.length < 6)  { authShowErr('authErrReg', 'Şifre en az 6 karakter olmalı.'); return; }
  if (pw !== pw2)     { authShowErr('authErrReg', 'Şifreler eşleşmiyor.'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { authShowErr('authErrReg', 'Geçerli bir e-posta girin.'); return; }
  const users = getAuthUsers();
  if (users.find(u => u.email === email)) { authShowErr('authErrReg', 'Bu e-posta zaten kayıtlı.'); return; }
  const newUser = {
    id: 'u_' + Date.now(), name, email,
    pw: await hashPw(pw),        // SHA-256 hash, not plaintext
    isAdmin: false,              // Normal kullanıcılar admin olamaz; sadece super admin hardcoded
    createdAt: new Date().toISOString()
  };
  users.push(newUser);
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
  localStorage.setItem(AUTH_SESSION_KEY, newUser.id);
  document.getElementById('authScreen').style.display = 'none';
  // New user: always show onboarding
  db.onboardingDone = false;
  db.profile.name = name;
  save();
  applyAuthToUI();
  checkOnboarding();
}

function authLogout() {
  if (!confirm('Çıkış yapmak istediğinize emin misiniz?')) return;
  localStorage.removeItem(AUTH_SESSION_KEY);
  location.reload();
}

// ---- ONBOARDING ----
function checkOnboarding() {
  if (!db.onboardingDone) {
    document.getElementById('onboarding').classList.add('active');
    document.getElementById('tabBar').style.display = 'none';
  }
}
// Super admin seed → ardından auth kontrolü
seedSuperAdmin().then(() => { checkAuth(); setTimeout(checkAdminMessages, 2000); });

let obSelectedLevel = db.lvl;
let obSelectedGoal  = db.profile.goal || 10;
let obSelectedAvatar = db.profile.avatar || '😊';

function obTcToggle() {
  const checked = document.getElementById('obTcCheck').checked;
  const btn = document.getElementById('obStartBtn');
  btn.disabled = !checked;
  btn.style.opacity = checked ? '1' : '.45';
}

function obNext(step) {
  document.querySelectorAll('.ob-step').forEach(s => s.classList.remove('active'));
  document.getElementById('ob' + step).classList.add('active');
}
function selectAvatar(emoji) {
  obSelectedAvatar = emoji;
  document.getElementById('obAvatarPreview').innerText = emoji;
}
function obSaveName() {
  const n = document.getElementById('obNameInput').value.trim();
  if (!n) { document.getElementById('obNameInput').focus(); return; }
  db.profile.name = n;
  db.profile.avatar = obSelectedAvatar;
  save();
  obNext(3);
}
function selectObLevel(el) {
  document.querySelectorAll('#ob3 .ob-level-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  obSelectedLevel = el.dataset.lvl;
  const btn = document.getElementById('obLvlNext');
  btn.disabled = false; btn.style.opacity = '1';
}
function obFinishLevel() {
  applyLevel(obSelectedLevel);
  obNext(4);
  // default select 10
  document.querySelector('.ob-level-card[data-goal="10"]')?.classList.add('selected'); obSelectedGoal = 10;
}
function selectGoal(el, val) {
  document.querySelectorAll('#ob4 .ob-level-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  obSelectedGoal = val;
}
function obComplete() {
  db.onboardingDone = true;
  db.profile.goal = obSelectedGoal;
  save();
  // Also mark in auth record so next login skips onboarding
  const session = getAuthSession();
  if (session) {
    const users = getAuthUsers();
    const idx = users.findIndex(u => u.id === session);
    if (idx !== -1) { users[idx].onboardingDone = true; users[idx].avatar = db.profile.avatar; localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users)); }
  }
  document.getElementById('onboarding').classList.remove('active');
  document.getElementById('tabBar').style.display = 'flex';
  launchConfetti();
  updateDailyGoalWidget();
  renderProfile();
}

// ---- PLACEMENT TEST ----
// ---- SINAV VERİSİ YÜKLE (sinavlar.js'den otomatik) ----
// sinavlarVerisi: [{ sinav_adi, sorular:[{soru_no, soru_metni, secenekler:{A,B,C,D}, dogru_cevap}] }]

function buildSinavQuestions(sinav) {
  // Dış format → iç format dönüştürücü
  return sinav.sorular.map(s => {
    const opts = ['A','B','C','D'].map(k => s.secenekler[k]).filter(Boolean);
    const ans  = ['A','B','C','D'].indexOf(s.dogru_cevap);
    return { q: s.soru_metni, opts, ans };
  });
}

// Placement test: "Seviye Belirleme Sınavı" adlı sınav
let PLACEMENT_Qs = [];
function loadPlacementFromGlobal() {
  if (typeof sinavlarVerisi === 'undefined') return;
  const found = sinavlarVerisi.find(s =>
    s.sinav_adi.toLowerCase().includes('belirleme') ||
    s.sinav_adi.toLowerCase().includes('placement')
  );
  if (found) PLACEMENT_Qs = buildSinavQuestions(found);
}
loadPlacementFromGlobal();

// Level gate: geçiş sınavları → seviye id'sine göre harita
const LEVEL_GATE_Qs = {};
function loadGateFromGlobal() {
  if (typeof sinavlarVerisi === 'undefined') return;
  const mapping = [
    { key: 'Sapling',  patterns: ['a1', 'a2'] },
    { key: 'Tree',     patterns: ['a2', 'b1'] },
    { key: 'Forest',   patterns: ['b1', 'b2'] },
    { key: 'Mountain', patterns: ['b2', 'c1'] },
    { key: 'Galaxy',   patterns: ['c1', 'c2'] },
  ];
  // Önce temizle
  Object.keys(LEVEL_GATE_Qs).forEach(k => delete LEVEL_GATE_Qs[k]);
  sinavlarVerisi.forEach(sinav => {
    const adi = sinav.sinav_adi.toLowerCase().replace(/\s/g,'');
    mapping.forEach(m => {
      const match = m.patterns.every(p => adi.includes(p));
      if (match && !LEVEL_GATE_Qs[m.key]) {
        LEVEL_GATE_Qs[m.key] = buildSinavQuestions(sinav);
      }
    });
  });
}
loadGateFromGlobal();

let ptIdx = 0, ptCorrect = 0, ptLevelScores = {};

function startPlacementTest() {
  if (PLACEMENT_Qs.length === 0) {
    notify('⚠️ sinavlar.js yüklenemedi — klasöre ekleyin');
    return;
  }
  ptIdx = 0; ptCorrect = 0;
  ptLevelScores = { A1:0,A2:0,B1:0,B2:0,C1:0,C2:0 };
  document.getElementById('ptResult').style.display = 'none';
  document.getElementById('ptQuestion').style.display = 'block';
  document.getElementById('ptOptions').style.display = 'grid';
  obNext(5);
  renderPlacementQ();
}

function renderPlacementQ() {
  if (ptIdx >= PLACEMENT_Qs.length) {
    finishPlacementTest();
    return;
  }
  const q = PLACEMENT_Qs[ptIdx];
  document.getElementById('ptProgress').innerText = `Soru ${ptIdx+1} / ${PLACEMENT_Qs.length}`;
  document.getElementById('ptQuestion').innerText = q.q;
  const optCont = document.getElementById('ptOptions');
  optCont.innerHTML = '';
  q.opts.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.textContent = opt;
    btn.style.cssText = 'padding:12px;border:2px solid var(--border);border-radius:12px;background:var(--surface);color:var(--text);font-family:\'DM Sans\',sans-serif;font-size:.9rem;cursor:pointer;transition:.2s;';
    btn.onclick = () => {
      // Disable all
      [...optCont.children].forEach(b => b.style.pointerEvents = 'none');
      if (i === q.ans) {
        btn.style.background = '#dcfce7'; btn.style.borderColor = '#22c55e';
        ptCorrect++;
        ptLevelScores[q.lvl] = (ptLevelScores[q.lvl] || 0) + 1;
      } else {
        btn.style.background = '#fef2f2'; btn.style.borderColor = '#ef4444';
        optCont.children[q.ans].style.background = '#dcfce7';
        optCont.children[q.ans].style.borderColor = '#22c55e';
      }
      setTimeout(() => { ptIdx++; renderPlacementQ(); }, 800);
    };
    optCont.appendChild(btn);
  });
}

function finishPlacementTest() {
  const total = PLACEMENT_Qs.length;
  const pct = ptCorrect / total;
  let detectedId;
  // 20 soruluk sınav için eşik değerleri
  if      (pct >= 0.88) detectedId = 'Galaxy';
  else if (pct >= 0.72) detectedId = 'Mountain';
  else if (pct >= 0.55) detectedId = 'Forest';
  else if (pct >= 0.38) detectedId = 'Tree';
  else if (pct >= 0.22) detectedId = 'Sapling';
  else                  detectedId = 'Sprout';

  applyLevel(detectedId);
  obSelectedLevel = detectedId;

  document.getElementById('ptQuestion').style.display = 'none';
  document.getElementById('ptOptions').style.display = 'none';
  const res = document.getElementById('ptResult');
  res.style.display = 'block';
  const cfg = getLvlConfig(detectedId);
  document.getElementById('ptResultEmoji').textContent = cfg.icon;
  document.getElementById('ptResultLevel').textContent = `${cfg.id} — ${cfg.cefr} seviyendesiniz`;
  document.getElementById('ptResultSub').textContent = `${ptCorrect}/${total} doğru cevap. Seviyeniz otomatik olarak ayarlandı.`;
}

const GATE_PASS_THRESHOLD = 0.75; // %75 geçme puanı
let lgQuestions = [], lgIdx = 0, lgScore = 0, lgTargetLvl = '';

function openLevelGate(targetLvlId) {
  lgTargetLvl = targetLvlId;
  lgQuestions = LEVEL_GATE_Qs[targetLvlId] || [];
  if (lgQuestions.length === 0) {
    if (typeof sinavlarVerisi === 'undefined') {
      notify('⚠️ sinavlar.js bulunamadı — seviye doğrudan değiştirildi');
    }
    applyLevel(targetLvlId);
    const cfg = getLvlConfig(targetLvlId);
    notify(`🎉 ${cfg.icon} ${cfg.id} seviyesine geçildi!`);
    return;
  }

  // Check 80% reading completion for current level
  const fromCfg = getLvlConfig(db.lvl);
  const levelReadings = db.readings.filter(r => r.lvl === fromCfg.cefr || r.lvl === fromCfg.id);
  if (levelReadings.length > 0) {
    const doneCount = levelReadings.filter(r => db.stats.completed[r.title]).length;
    const completionPct = Math.round((doneCount / levelReadings.length) * 100);
    if (completionPct < 80 && !isSuperAdminUser()) {
      notify(`⚠️ Sınava girebilmek için ${fromCfg.id} seviyesinin en az %80'ini tamamlamalısınız! (${completionPct}% tamamlandı)`);
      return;
    }
  }

  const cfg = getLvlConfig(targetLvlId);

  // Onay ekranını doldur
  document.getElementById('lgEmoji').textContent  = cfg.icon;
  document.getElementById('lgTitle').textContent  = `${cfg.id} Seviye Sınavı`;
  document.getElementById('lgSub').textContent    = `${fromCfg.icon} ${fromCfg.id} → ${cfg.icon} ${cfg.id}`;
  document.getElementById('lgMeta').textContent   = `${lgQuestions.length} soru · Geçme puanı %75`;

  // Aşamaları sıfırla
  document.getElementById('lgConfirm').style.display   = 'block';
  document.getElementById('lgQuizArea').style.display  = 'none';
  document.getElementById('lgResult').style.display    = 'none';
  openModal('levelGateModal');
}

function lgStartExam() {
  lgIdx = 0; lgScore = 0;
  document.getElementById('lgConfirm').style.display   = 'none';
  document.getElementById('lgQuizArea').style.display  = 'block';
  document.getElementById('lgResult').style.display    = 'none';
  renderLGQuestion();
}

function lgAbortExam() {
  if (!confirm('Sınavdan çıkmak istiyor musunuz? İlerlemeniz kaydedilmeyecek.')) return;
  closeModal('levelGateModal');
}

function renderLGQuestion() {
  if (lgIdx >= lgQuestions.length) { finishLevelGate(); return; }
  const q     = lgQuestions[lgIdx];
  const total = lgQuestions.length;
  const pct   = Math.round((lgIdx / total) * 100);

  document.getElementById('lgProgressBar').style.width = pct + '%';
  document.getElementById('lgProgress').textContent    = `${lgIdx + 1} / ${total}`;
  document.getElementById('lgQuestion').textContent    = q.q;

  const cont = document.getElementById('lgOptions');
  cont.innerHTML = '';
  q.opts.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.textContent = opt;
    btn.style.cssText = 'width:100%;padding:12px 14px;border:2px solid var(--border);border-radius:12px;background:var(--surface);color:var(--text);font-family:\'DM Sans\',sans-serif;font-size:.9rem;cursor:pointer;text-align:left;transition:.15s;';
    btn.onmouseover = () => { if (btn.style.pointerEvents !== 'none') btn.style.background = 'var(--lvl-soft)'; };
    btn.onmouseout  = () => { if (btn.style.pointerEvents !== 'none' && !btn.dataset.marked) btn.style.background = 'var(--surface)'; };
    btn.onclick = () => {
      [...cont.children].forEach(b => { b.style.pointerEvents = 'none'; b.onmouseover = null; });
      if (i === q.ans) {
        btn.style.cssText += 'background:#dcfce7!important;border-color:#22c55e;color:#166534;font-weight:700;';
        lgScore++;
      } else {
        btn.style.cssText += 'background:#fef2f2!important;border-color:#ef4444;color:#991b1b;';
        const correct = cont.children[q.ans];
        if (correct) correct.style.cssText += 'background:#dcfce7!important;border-color:#22c55e;color:#166534;font-weight:700;';
      }
      setTimeout(() => { lgIdx++; renderLGQuestion(); }, 900);
    };
    cont.appendChild(btn);
  });
}


// ---- CERTIFICATE SYSTEM ----
function showCertificate(levelId) {
  const cfg = getLvlConfig(levelId);
  const user = getCurrentUser();
  const name = user?.name || db.profile?.name || 'Öğrenci';
  const date = new Date().toLocaleDateString('tr-TR', { year:'numeric', month:'long', day:'numeric' });
  
  // Create certificate modal
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;padding:20px;';
  modal.innerHTML = `
    <div style="background:white;border-radius:24px;padding:40px 32px;max-width:380px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.4);position:relative;border:3px solid ${cfg.color};">
      <div style="font-size:3rem;margin-bottom:8px;">${cfg.icon}</div>
      <div style="font-family:'Playfair Display',serif;font-size:1.6rem;font-weight:700;color:${cfg.dark};margin-bottom:4px;">Başarı Sertifikası</div>
      <div style="font-size:.8rem;color:#666;margin-bottom:20px;letter-spacing:1px;text-transform:uppercase;">LinguiVance • Read&Listen</div>
      <div style="width:60px;height:3px;background:${cfg.color};margin:0 auto 20px;border-radius:2px;"></div>
      <div style="font-family:'Playfair Display',serif;font-size:1.2rem;font-weight:700;color:#1a1a1a;margin-bottom:6px;">${name}</div>
      <div style="font-size:.85rem;color:#555;margin-bottom:20px;line-height:1.6;">${cfg.id} (${cfg.cefr}) seviyesini başarıyla tamamlayarak<br>bir üst seviyeye geçmeye hak kazanmıştır.</div>
      <div style="display:inline-block;background:${cfg.color}22;color:${cfg.dark};font-size:1.8rem;font-weight:800;font-family:'Playfair Display',serif;padding:12px 24px;border-radius:12px;border:2px solid ${cfg.color};">${cfg.cefr}</div>
      <div style="font-size:.72rem;color:#999;margin-top:20px;">${date}</div>
      <button onclick="this.closest('div[style]').remove()" style="margin-top:20px;width:100%;padding:12px;background:${cfg.color};color:white;border:none;border-radius:12px;font-family:'DM Sans',sans-serif;font-weight:700;font-size:.95rem;cursor:pointer;">🎉 Harika!</button>
    </div>
  `;
  document.body.appendChild(modal);
}

function finishLevelGate() {
  const total  = lgQuestions.length;
  const pct    = lgScore / total;
  const passed = pct >= GATE_PASS_THRESHOLD;
  const pctPct = Math.round(pct * 100);

  document.getElementById('lgQuizArea').style.display = 'none';
  document.getElementById('lgResult').style.display   = 'block';
  document.getElementById('lgProgressBar').style.width = '100%';

  // Puan çubuğu
  const bar = document.getElementById('lgScoreBar');
  bar.style.background = passed ? '#22c55e' : '#ef4444';
  setTimeout(() => { bar.style.width = pctPct + '%'; }, 100);
  document.getElementById('lgScoreLabel').textContent =
    `${lgScore} / ${total} doğru  —  %${pctPct}  (Geçme: %${Math.round(GATE_PASS_THRESHOLD*100)})`;

  if (passed) {
    applyLevel(lgTargetLvl);
    // Mark this level as unlocked so future clicks skip the exam
    if (!db.unlockedLevels) db.unlockedLevels = [];
    if (!db.unlockedLevels.includes(lgTargetLvl)) db.unlockedLevels.push(lgTargetLvl);
    save();
    const cfg = getLvlConfig(lgTargetLvl);
    document.getElementById('lgResultEmoji').textContent = '🎉';
    document.getElementById('lgResultTitle').textContent = `Tebrikler! ${cfg.icon} ${cfg.id} açıldı`;
    document.getElementById('lgResultSub').textContent   = 'Yeni seviyenizde başarılar!';
    const btn = document.getElementById('lgResultBtn');
    btn.textContent = '🚀 Devam Et';
    btn.onclick = () => { closeModal('levelGateModal'); launchConfetti(); setTimeout(() => showCertificate(lgTargetLvl), 800); };
  } else {
    document.getElementById('lgResultEmoji').textContent = '❌';
    document.getElementById('lgResultTitle').textContent = 'Sınav başarısız';
    document.getElementById('lgResultSub').textContent   = 'Okuma metinleri ve kelime kasanızı çalışın, tekrar deneyin.';
    const btn = document.getElementById('lgResultBtn');
    btn.textContent = '🔄 Tekrar Dene';
    btn.onclick = () => { lgStartExam(); };
  }
}

// ---- TAB BAR ----
const TAB_MAP = {
  home:    'home',
  learn:   'readList',
  vocab:   'cardScreen',
  stats:   'stats',
  profile: 'profileScreen',
};
function tabGo(tab) {
  // Tab bar active state
  document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
  const tabEl = document.getElementById('tab-' + tab);
  if (tabEl) tabEl.classList.add('active');

  // Hide tab bar for certain screens
  const noTab = ['cardScreen', 'quizScreen', 'resultScreen', 'readMod'];

  if (tab === 'home') {
    show('home');
    document.getElementById('tabBar').style.display = 'flex';
    updateDailyGoalWidget();
  } else if (tab === 'learn') {
    show('readList');
    document.getElementById('tabBar').style.display = 'flex';
  } else if (tab === 'vocab') {
    if (db.unknown.length === 0 && db.dictionary.length === 0) {
      notify('Hikayeleri oku ve kelimelere dokun! 📖');
      return;
    }
    openCards();
    document.getElementById('tabBar').style.display = 'none';
  } else if (tab === 'stats') {
    showStats();
    document.getElementById('tabBar').style.display = 'flex';
  } else if (tab === 'profile') {
    renderProfile();
    show('profileScreen');
    document.getElementById('tabBar').style.display = 'flex';
  }
}

// ---- PROFILE RENDER ----
function renderProfile() {
  const p = db.profile;
  // Avatar & name
  document.getElementById('profileAvatarEmoji').innerText = p.avatar || '😊';
  document.getElementById('profileNameDisplay').innerText = p.name || 'Kullanıcı';
  // Level badge
  const lvl = getLvlConfig(db.lvl);
  document.getElementById('profileLevelBadge').innerText = `${lvl.icon} ${lvl.id} — ${lvl.cefr}`;
  // Stats
  document.getElementById('pStatWords').innerText    = db.stats.learnedWords || db.unknown.length;
  const completed = db.readings.filter(r => db.stats.completed[r.title]).length;
  document.getElementById('pStatReadings').innerText = completed;
  document.getElementById('pStatStreak').innerText   = streakCount();
  const acc = db.stats.total > 0 ? Math.round((db.stats.correct/db.stats.total)*100)+'%' : '—';
  document.getElementById('pStatAccuracy').innerText = acc;
  // Goal
  document.getElementById('profileGoalVal').innerText = (p.goal || 10) + ' kelime';
  // Lang
  document.getElementById('profileLangVal').innerText = db.lang;
  // Badges
  renderBadges();
  updateToggleUI();
}

// ---- BADGES ----
const BADGE_LIST = [
  { id:'first_word',   icon:'🌱', name:'İlk Kelime',    desc:'İlk kelimeyi kasaya ekle',        check: () => db.unknown.length >= 1 },
  { id:'vocab10',      icon:'🌿', name:'10 Kelime',     desc:'10 kelime öğren',                  check: () => (db.stats.learnedWords||0) >= 10 },
  { id:'vocab50',      icon:'🎯', name:'50 Kelime',     desc:'50 kelime öğren',                  check: () => (db.stats.learnedWords||0) >= 50 },
  { id:'vocab100',     icon:'🌟', name:'100 Kelime',    desc:'100 kelime öğren',                 check: () => (db.stats.learnedWords||0) >= 100 },
  { id:'first_quiz',   icon:'🏆', name:'İlk Quiz',      desc:'İlk quizi tamamla',                check: () => db.stats.total >= 1 },
  { id:'perfect_quiz', icon:'🔥', name:'Mükemmel',      desc:'90%+ quiz skoru',                  check: () => db.stats.total > 0 && (db.stats.correct/db.stats.total) >= 0.9 },
  { id:'streak3',      icon:'💎', name:'3 Gün Serisi',  desc:'3 gün üst üste çalış',             check: () => streakCount() >= 3 },
  { id:'streak7',      icon:'📖', name:'7 Gün Serisi',  desc:'7 gün üst üste çalış',             check: () => streakCount() >= 7 },
  { id:'streak30',     icon:'🌙', name:'1 Ay Serisi',   desc:'30 gün üst üste çalış',            check: () => streakCount() >= 30 },
  { id:'story1',       icon:'📚', name:'İlk Hikaye',    desc:'İlk okumayı tamamla',              check: () => Object.keys(db.stats.completed).length >= 1 },
];

function renderBadges() {
  const grid = document.getElementById('badgesGrid');
  grid.innerHTML = '';
  BADGE_LIST.forEach(b => {
    const earned = b.check();
    const div = document.createElement('div');
    div.className = 'badge-item';
    div.innerHTML = `
      <div class="badge-icon ${earned?'earned':'locked'}" title="${b.desc}">${b.icon}</div>
      <div class="badge-name">${b.name}</div>`;
    grid.appendChild(div);
  });
}

// ---- DAILY GOAL WIDGET ----
function updateDailyGoalWidget() {
  const goal = db.profile?.goal || 10;
  const doneWords = db.todayWords || 0;
  const doneRead = db.todayRead || 0;
  const doneListen = db.todayListen || 0;

  const pctWord = Math.min(100, Math.round((doneWords / goal) * 100));
  const pctRead = doneRead >= 1 ? 100 : 0;
  const pctListen = doneListen >= 1 ? 100 : 0;

  const titleEl = document.getElementById('goalTitle');
  if (titleEl) titleEl.innerText = goal;
  const wordFill = document.getElementById('goalWordFill');
  if (wordFill) wordFill.style.width = pctWord + '%';
  const wordVal = document.getElementById('goalWordVal');
  if (wordVal) wordVal.innerText = doneWords;
  const wordMax = document.getElementById('goalWordMax');
  if (wordMax) wordMax.innerText = goal;
  const readFill = document.getElementById('goalReadFill');
  if (readFill) readFill.style.width = pctRead + '%';
  const readVal = document.getElementById('goalReadVal');
  if (readVal) readVal.innerText = doneRead;
  const listenFill = document.getElementById('goalListenFill');
  if (listenFill) listenFill.style.width = pctListen + '%';
  const listenVal = document.getElementById('goalListenVal');
  if (listenVal) listenVal.innerText = doneListen;

  const sub = document.getElementById('goalSub');
  if (sub) sub.innerText = `${doneWords} / ${goal} kelime · ${doneRead} okuma · ${doneListen} dinleme`;
}
updateDailyGoalWidget();

// ---- DARK MODE ----
function toggleDarkMode() {
  db.settings.darkMode = !db.settings.darkMode;
  document.body.classList.toggle('dark-mode', db.settings.darkMode);
  const btn = document.querySelector('[aria-label="Karanlık Mod"]');
  if (btn) btn.setAttribute('aria-pressed', db.settings.darkMode ? 'true' : 'false');
  updateToggleUI();
  save();
}
function updateToggleUI() {
  const td = document.getElementById('toggleDark');
  if (td) td.classList.toggle('on', !!db.settings?.darkMode);
  const tn = document.getElementById('toggleNotif');
  if (tn) tn.classList.toggle('on', !!db.settings?.notifications);
  const ts = document.getElementById('toggleSound');
  if (ts) ts.classList.toggle('on', db.settings?.sound !== false);
  // Update aria-pressed for settings items
  const notifItem = document.querySelector('[aria-label="Günlük Hatırlatma"]');
  if (notifItem) notifItem.setAttribute('aria-pressed', !!db.settings?.notifications ? 'true' : 'false');
  const soundItem = document.querySelector('[aria-label="Ses Efektleri"]');
  if (soundItem) soundItem.setAttribute('aria-pressed', db.settings?.sound !== false ? 'true' : 'false');
}

// ---- SETTINGS TOGGLES ----
function toggleSetting(key) {
  if (!db.settings) db.settings = {};
  db.settings[key] = !db.settings[key];
  if (key === 'notifications' && db.settings.notifications) {
    // Check current permission state first
    if (Notification.permission === 'denied') {
      db.settings.notifications = false;
      updateToggleUI(); save();
      notify('⚠️ Bildirimler engellendi. Tarayıcı ayarlarından izin verin.');
      return;
    }
    if (Notification.permission === 'granted') {
      updateToggleUI(); save();
      notify('🔔 Bildirimler açık!');
      return;
    }
    // 'default' — show custom explanation before browser prompt
    openModal('notifPermModal');
    db.settings.notifications = false; // reset until granted
  } else {
    updateToggleUI(); save();
  }
}

async function requestNotifPermission() {
  closeModal('notifPermModal');
  const perm = await Notification.requestPermission();
  if (!db.settings) db.settings = {};
  db.settings.notifications = (perm === 'granted');
  updateToggleUI(); save();
  if (perm === 'granted') {
    notify('🔔 Bildirimler etkinleştirildi!');
    // Schedule a test notification
    setTimeout(() => {
      new Notification('LinguiVance 🌍', {
        body: 'Harika! Günlük hatırlatmalar etkin.',
        icon: './icons/icon-192x192.png',
        badge: './icons/icon-72x72.png'
      });
    }, 1000);
  } else {
    notify('Bildirim izni verilmedi.');
  }
}

// ---- AVATAR CHANGE ----
function changeAvatar() {
  const emojis = ['😊','🧑‍💻','👩‍🎓','🧑‍🚀','🦁','🐉','🌟','🎯','🦊','🐻','🦋','🌺'];
  const current = db.profile?.avatar || '😊';
  const idx = (emojis.indexOf(current) + 1) % emojis.length;
  db.profile.avatar = emojis[idx];
  document.getElementById('profileAvatarEmoji').innerText = db.profile.avatar;
  save();
}

// ---- CHANGE GOAL ----
function changeGoal() {
  const goals = [10, 50, 100];
  const curr = db.profile?.goal || 10;
  const idx = (goals.indexOf(curr) + 1) % goals.length;
  db.profile.goal = goals[idx];
  save();
  renderProfile();
  updateDailyGoalWidget();
  notify(`🎯 Günlük hedef: ${db.profile.goal} kelime`);
}

// ---- CHANGE LANG ----
function changeLang() {
  toggleLang();
  renderProfile();
}

// ---- MODALS ----
function openModal(id) {
  const modal = document.getElementById(id);
  modal.classList.add('active');
  // Trap focus in modal and set focus to first focusable element
  requestAnimationFrame(() => {
    const focusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable) focusable.focus();
  });
  // Store last focused element for restoration
  modal._lastFocus = document.activeElement;
}
function closeModal(id) {
  const modal = document.getElementById(id);
  modal.classList.remove('active');
  // Restore focus to the element that opened the modal
  if (modal._lastFocus && modal._lastFocus !== document.body) {
    modal._lastFocus.focus();
  }
}
function showLegal(type) {
  closeModal('aboutModal');
  openModal(type === 'privacy' ? 'privacyModal' : 'termsModal');
}

// ---- DELETE ACCOUNT ----
function deleteAccount() {
  closeModal('deleteModal');
  localStorage.clear();
  location.reload();
}

// Override old resetAll to use modal
function resetAll() { openModal('deleteModal'); }

// ---- CONFETTI ----
function launchConfetti() {
  const colors = ['#4ade80','#34d399','#fbbf24','#fb923c','#f87171','#a78bfa','#60a5fa','#f472b6'];
  for (let i = 0; i < 60; i++) {
    setTimeout(() => {
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      el.style.cssText = `
        left: ${Math.random()*100}vw;
        top: -10px;
        background: ${colors[Math.floor(Math.random()*colors.length)]};
        width: ${6 + Math.random()*8}px;
        height: ${6 + Math.random()*8}px;
        border-radius: ${Math.random() > .5 ? '50%' : '2px'};
        animation-duration: ${1.5 + Math.random()*2}s;
        animation-delay: ${Math.random()*.5}s;
      `;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 3000);
    }, i * 30);
  }
}

/* ============================================================
   V16 — ADMIN PANEL & JSON AUTO-LOAD
   ============================================================ */

// ---- DEFAULT ADMIN PASSWORD (ilk kurulumda değiştirin) ----
const ADMIN_PW_KEY = 'lv_admin_pw';
function getAdminPw() { return localStorage.getItem(ADMIN_PW_KEY) || 'admin123'; }

// ---- ADMIN LOGIN ----
function openAdminLogin() {
  const el = document.getElementById('adminLoginOverlay');
  el.style.display = 'flex';
  document.getElementById('adminPwInput').value = '';
  document.getElementById('adminPwError').style.display = 'none';
  setTimeout(() => document.getElementById('adminPwInput').focus(), 100);
}
function closeAdminLogin() {
  document.getElementById('adminLoginOverlay').style.display = 'none';
}
function adminLogin() {
  const pw = document.getElementById('adminPwInput').value;
  if (pw === getAdminPw()) {
    closeAdminLogin();
    openAdminPanel();
  } else {
    document.getElementById('adminPwError').style.display = 'block';
    document.getElementById('adminPwInput').value = '';
    document.getElementById('adminPwInput').focus();
  }
}

// ---- ADMIN PANEL ----
function openAdminPanel() {
  document.getElementById('adminPanel').style.display = 'block';
  adminTabGo('users');
  renderAdminStats();
}
function closeAdminPanel() {
  document.getElementById('adminPanel').style.display = 'none';
}

function adminTabGo(tab) {
  ['users','data','edit','settings'].forEach(t => {
    const el = document.getElementById('adminTab-' + t);
    if (el) el.style.display = t === tab ? 'block' : 'none';
    const btn = document.getElementById('atab-' + t);
    if (btn) btn.className = 'admin-tab-btn' + (t === tab ? ' active' : '');
  });
  if (tab === 'users') renderAdminUsers();
  if (tab === 'data')  renderAdminDataInfo();
  if (tab === 'edit')  adminInitEditTab();
}

// ---- İÇERİK DÜZENLEME (Reading + Kelimeler + Sınavlar) ----
let adminEditIdx = null;
let adminWordEditIdx = null;
let adminSinavEditIdx = null;
let adminEditCurrentType = 'reading';

function adminInitEditTab() {
  adminEditTypeSwitch(adminEditCurrentType);
}

function adminEditTypeSwitch(type) {
  adminEditCurrentType = type;
  ['reading','kelime','sinav'].forEach(t => {
    const sec = document.getElementById('adminEditSec-' + t);
    const btn = document.getElementById('adminEditTypeBtn-' + t);
    if (sec) sec.style.display = (t === type) ? '' : 'none';
    if (btn) {
      btn.style.background = (t === type) ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : 'var(--border)';
      btn.style.color = (t === type) ? 'white' : 'var(--text)';
      btn.style.fontWeight = (t === type) ? '700' : '600';
    }
  });
  if (type === 'reading') adminFilterEditList();
  if (type === 'kelime') adminFilterWordList();
  if (type === 'sinav') adminFilterSinavList();
}

// --- READING ---
function adminFilterEditList() {
  const lvl = document.getElementById('adminEditLevel').value;
  const q   = (document.getElementById('adminEditSearch').value || '').toLowerCase().trim();
  const sel = document.getElementById('adminEditList');
  sel.innerHTML = '';
  const list = db.readings.filter(r =>
    (!lvl || r.lvl === lvl) &&
    (!q   || r.title.toLowerCase().includes(q))
  );
  if (list.length === 0) {
    sel.innerHTML = '<option value="">— Metin bulunamadı —</option>';
    return;
  }
  list.forEach((r) => {
    const realIdx = db.readings.indexOf(r);
    const opt = document.createElement('option');
    opt.value = realIdx;
    opt.textContent = `[${r.lvl}] ${r.title}`;
    sel.appendChild(opt);
  });
  if (sel.options.length > 0) {
    sel.selectedIndex = 0;
    adminLoadEditText();
  }
}

function adminLoadEditText() {
  const sel = document.getElementById('adminEditList');
  const idx = parseInt(sel.value);
  if (isNaN(idx) || !db.readings[idx]) return;
  adminEditIdx = idx;
  const r = db.readings[idx];
  document.getElementById('adminEditTitle').textContent = r.title;
  document.getElementById('adminEditLvlBadge').textContent = r.lvl;
  document.getElementById('adminEditEn').value = r.en || '';
  document.getElementById('adminEditTr').value = r.tr || '';
  document.getElementById('adminEditPanel').style.display = 'block';
}

function adminSaveEdit() {
  if (adminEditIdx === null || !db.readings[adminEditIdx]) return;
  db.readings[adminEditIdx].en = document.getElementById('adminEditEn').value.trim();
  db.readings[adminEditIdx].tr = document.getElementById('adminEditTr').value.trim();
  save();
  notify(`✅ "${db.readings[adminEditIdx].title}" kaydedildi`);
}

function adminCancelEdit() {
  adminEditIdx = null;
  document.getElementById('adminEditPanel').style.display = 'none';
  document.getElementById('adminEditList').selectedIndex = -1;
}

function adminDownloadReadings() {
  const data = JSON.stringify(db.readings, null, 2);
  const js = '// reading.js — LinguiVance Reading Data\n// İndirme tarihi: ' + new Date().toLocaleString('tr-TR') + '\n// Toplam: ' + db.readings.length + ' metin\n\nconst READING_DATA = ' + data + ';';
  const blob = new Blob([js], { type: 'text/javascript' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'reading.js';
  a.click();
  URL.revokeObjectURL(a.href);
  notify('📥 reading.js indirildi! Proje klasörünüzdeki reading.js ile değiştirin.');
}

// --- KELİMELER ---
function adminFilterWordList() {
  const lvl = (document.getElementById('adminWordLevel').value || '').toUpperCase();
  const q   = (document.getElementById('adminWordSearch').value || '').toLowerCase().trim();
  const sel = document.getElementById('adminWordList');
  const cnt = document.getElementById('adminWordCount');
  sel.innerHTML = '';
  if (!db.dictionary || db.dictionary.length === 0) {
    sel.innerHTML = '<option value="">— Kelime verisi yüklü değil —</option>';
    if (cnt) cnt.textContent = 'Toplam: 0 kelime';
    return;
  }
  const list = db.dictionary.filter(w =>
    (!lvl || (w.cefr || '').toUpperCase() === lvl) &&
    (!q   || w.w.toLowerCase().includes(q) || (w.tr||'').toLowerCase().includes(q))
  );
  if (cnt) cnt.textContent = 'Gösterilen: ' + list.length + ' / Toplam: ' + db.dictionary.length + ' kelime';
  if (list.length === 0) {
    sel.innerHTML = '<option value="">— Kelime bulunamadı —</option>';
    return;
  }
  const MAX_SHOW = 200;
  list.slice(0, MAX_SHOW).forEach((w) => {
    const realIdx = db.dictionary.indexOf(w);
    const opt = document.createElement('option');
    opt.value = realIdx;
    opt.textContent = '[' + (w.cefr||'?') + '] ' + w.w + ' — ' + (w.tr||'?');
    sel.appendChild(opt);
  });
  if (list.length > MAX_SHOW) {
    const note = document.createElement('option');
    note.disabled = true;
    note.textContent = '... ve ' + (list.length - MAX_SHOW) + ' daha. Aramayı daraltın.';
    sel.appendChild(note);
  }
}

function adminLoadWord() {
  const sel = document.getElementById('adminWordList');
  const idx = parseInt(sel.value);
  if (isNaN(idx) || !db.dictionary[idx]) return;
  adminWordEditIdx = idx;
  const w = db.dictionary[idx];
  document.getElementById('adminWordEditTitle').textContent = '✏️ ' + w.w + ' [' + (w.cefr||'') + ']';
  document.getElementById('adminWordW').value  = w.w   || '';
  document.getElementById('adminWordTr').value = w.tr  || '';
  document.getElementById('adminWordTe').value = w.te  || '';
  document.getElementById('adminWordTt').value = w.tt  || '';
  document.getElementById('adminWordDe').value = w.de  || '';
  document.getElementById('adminWordDt').value = w.dt  || '';
  document.getElementById('adminWordE1').value  = w.e1  || '';
  document.getElementById('adminWordE1t').value = w.e1t || '';
  document.getElementById('adminWordE2').value  = w.e2  || '';
  document.getElementById('adminWordE2t').value = w.e2t || '';
  document.getElementById('adminWordPanel').style.display = 'block';
}

function adminSaveWord() {
  if (adminWordEditIdx === null || !db.dictionary[adminWordEditIdx]) return;
  const w = db.dictionary[adminWordEditIdx];
  w.w   = document.getElementById('adminWordW').value.trim();
  w.tr  = document.getElementById('adminWordTr').value.trim();
  w.te  = document.getElementById('adminWordTe').value.trim();
  w.tt  = document.getElementById('adminWordTt').value.trim();
  w.de  = document.getElementById('adminWordDe').value.trim();
  w.dt  = document.getElementById('adminWordDt').value.trim();
  w.e1  = document.getElementById('adminWordE1').value.trim();
  w.e1t = document.getElementById('adminWordE1t').value.trim();
  w.e2  = document.getElementById('adminWordE2').value.trim();
  w.e2t = document.getElementById('adminWordE2t').value.trim();
  try { localStorage.setItem('lv_dict_cache_v1', JSON.stringify(db.dictionary)); } catch(e) {}
  notify('✅ "' + w.w + '" kaydedildi (önbelleğe yazıldı)');
  adminFilterWordList();
}

function adminCancelWord() {
  adminWordEditIdx = null;
  document.getElementById('adminWordPanel').style.display = 'none';
  document.getElementById('adminWordList').selectedIndex = -1;
}

function adminDownloadWords() {
  const data = JSON.stringify(db.dictionary, null, 2);
  const js = '// kelimeler.js — LinguiVance Kelime Verisi\n// İndirme tarihi: ' + new Date().toLocaleString('tr-TR') + '\n// Toplam: ' + db.dictionary.length + ' kelime\n\nconst KELIMELER = ' + data + ';';
  const blob = new Blob([js], { type: 'text/javascript' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'kelimeler.js';
  a.click();
  URL.revokeObjectURL(a.href);
  notify('📥 kelimeler.js indirildi! Proje klasörünüzdeki kelimeler.js ile değiştirin.');
}

// --- SINAVLAR ---
function adminFilterSinavList() {
  const q   = (document.getElementById('adminSinavSearch').value || '').toLowerCase().trim();
  const sel = document.getElementById('adminSinavEditList');
  sel.innerHTML = '';
  if (typeof sinavlarVerisi === 'undefined' || !sinavlarVerisi || sinavlarVerisi.length === 0) {
    sel.innerHTML = '<option value="">— Sınav verisi yüklü değil —</option>';
    return;
  }
  const list = sinavlarVerisi.filter(s =>
    !q || s.sinav_adi.toLowerCase().includes(q)
  );
  if (list.length === 0) {
    sel.innerHTML = '<option value="">— Sınav bulunamadı —</option>';
    return;
  }
  list.forEach((s) => {
    const realIdx = sinavlarVerisi.indexOf(s);
    const opt = document.createElement('option');
    opt.value = realIdx;
    opt.textContent = '[' + (s.sorular ? s.sorular.length : 0) + ' soru] ' + s.sinav_adi;
    sel.appendChild(opt);
  });
  if (sel.options.length > 0) {
    sel.selectedIndex = 0;
    adminLoadSinav();
  }
}

function adminLoadSinav() {
  const sel = document.getElementById('adminSinavEditList');
  const idx = parseInt(sel.value);
  if (isNaN(idx) || typeof sinavlarVerisi === 'undefined' || !sinavlarVerisi[idx]) return;
  adminSinavEditIdx = idx;
  const s = sinavlarVerisi[idx];
  document.getElementById('adminSinavEditTitle').textContent = '📝 ' + s.sinav_adi;
  document.getElementById('adminSinavEditInfo').textContent = (s.sorular ? s.sorular.length : 0) + ' soru';
  const qList = document.getElementById('adminSinavQList');
  qList.innerHTML = '';
  (s.sorular || []).forEach((soru, qi) => {
    const div = document.createElement('div');
    div.style.cssText = 'border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:10px;background:var(--bg);';
    const opts = ['A','B','C','D'];
    const secsHtml = opts.map(k => '<div style="display:flex;align-items:center;gap:6px;"><span style="font-weight:700;color:var(--muted);font-size:.78rem;min-width:18px;">' + k + ')</span><input data-qi="' + qi + '" data-field="sec_' + k + '" value="' + ((soru.secenekler||{})[k]||'').replace(/"/g,'&quot;') + '" style="flex:1;border:2px solid var(--border);border-radius:6px;padding:6px 8px;font-size:.8rem;background:var(--surface);color:var(--text);"></div>').join('');
    const selHtml = opts.map(k => '<option value="' + k + '"' + (soru.dogru_cevap===k?' selected':'') + '>' + k + '</option>').join('');
    div.innerHTML = '<div style="font-size:.78rem;font-weight:700;color:var(--muted);margin-bottom:6px;">Soru ' + (qi+1) + '</div><textarea data-qi="' + qi + '" data-field="soru_metni" rows="2" style="width:100%;border:2px solid var(--border);border-radius:8px;padding:8px;font-size:.82rem;background:var(--surface);color:var(--text);resize:vertical;margin-bottom:8px;">' + (soru.soru_metni||'') + '</textarea><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;">' + secsHtml + '</div><div style="display:flex;align-items:center;gap:8px;"><span style="font-size:.78rem;color:var(--muted);">✅ Doğru:</span><select data-qi="' + qi + '" data-field="dogru_cevap" style="border:2px solid var(--border);border-radius:6px;padding:5px 10px;font-size:.85rem;background:var(--surface);color:var(--text);">' + selHtml + '</select></div>';
    qList.appendChild(div);
  });
  document.getElementById('adminSinavPanel').style.display = 'block';
}

function adminSaveSinav() {
  if (adminSinavEditIdx === null || typeof sinavlarVerisi === 'undefined' || !sinavlarVerisi[adminSinavEditIdx]) return;
  const s = sinavlarVerisi[adminSinavEditIdx];
  const qList = document.getElementById('adminSinavQList');
  qList.querySelectorAll('[data-qi]').forEach(el => {
    const qi = parseInt(el.getAttribute('data-qi'));
    const field = el.getAttribute('data-field');
    const val = el.value;
    if (!s.sorular[qi]) return;
    if (field === 'soru_metni') { s.sorular[qi].soru_metni = val.trim(); }
    else if (field === 'dogru_cevap') { s.sorular[qi].dogru_cevap = val; }
    else if (field.startsWith('sec_')) {
      const k = field.replace('sec_','');
      if (!s.sorular[qi].secenekler) s.sorular[qi].secenekler = {};
      s.sorular[qi].secenekler[k] = val.trim();
    }
  });
  if (typeof loadGateFromGlobal === 'function') loadGateFromGlobal();
  if (typeof loadPlacementFromGlobal === 'function') loadPlacementFromGlobal();
  notify('✅ "' + s.sinav_adi + '" kaydedildi (oturum hafızasında)');
}

function adminCancelSinav() {
  adminSinavEditIdx = null;
  document.getElementById('adminSinavPanel').style.display = 'none';
  document.getElementById('adminSinavEditList').selectedIndex = -1;
}

function adminDownloadSinavlar() {
  if (typeof sinavlarVerisi === 'undefined') { notify('⚠️ Sınav verisi yüklü değil'); return; }
  const data = JSON.stringify(sinavlarVerisi, null, 2);
  const js = '// sinavlar.js — LinguiVance Sınav Verisi\n// İndirme tarihi: ' + new Date().toLocaleString('tr-TR') + '\n// Toplam: ' + sinavlarVerisi.length + ' sınav\n\nconst sinavlarVerisi = ' + data + ';';
  const blob = new Blob([js], { type: 'text/javascript' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'sinavlar.js';
  a.click();
  URL.revokeObjectURL(a.href);
  notify('📥 sinavlar.js indirildi! Proje klasörünüzdeki sinavlar.js ile değiştirin.');
}

// ---- KULLANICI YÖNETİMİ ----

// ---- ADMIN MESSAGING ----
const ADMIN_MSG_KEY = 'lv_admin_msgs';

function adminSendMsg(userId, userName) {
  const msg = prompt(`"${userName}" kullanıcısına mesaj gönder:`);
  if (!msg || !msg.trim()) return;
  const msgs = JSON.parse(localStorage.getItem(ADMIN_MSG_KEY) || '{}');
  if (!msgs[userId]) msgs[userId] = [];
  msgs[userId].push({
    text: msg.trim(),
    from: 'Admin',
    date: new Date().toISOString(),
    read: false
  });
  localStorage.setItem(ADMIN_MSG_KEY, JSON.stringify(msgs));
  notify(`✅ Mesaj "${userName}"a gönderildi.`);
}

function checkAdminMessages() {
  const session = getAuthSession();
  if (!session) return;
  const msgs = JSON.parse(localStorage.getItem(ADMIN_MSG_KEY) || '{}');
  const userMsgs = (msgs[session] || []).filter(m => !m.read);
  if (userMsgs.length === 0) return;
  // Show unread messages
  userMsgs.forEach(m => {
    const d = new Date(m.date).toLocaleDateString('tr-TR');
    setTimeout(() => {
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:20px;';
      overlay.innerHTML = `
        <div style="background:white;border-radius:20px;padding:28px 24px;max-width:360px;width:100%;box-shadow:0 20px 50px rgba(0,0,0,.3);">
          <div style="font-size:2rem;margin-bottom:8px;text-align:center;">💬</div>
          <div style="font-weight:700;font-size:1rem;margin-bottom:4px;text-align:center;">Yönetici Mesajı</div>
          <div style="font-size:.72rem;color:#999;text-align:center;margin-bottom:16px;">${d}</div>
          <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:14px;font-size:.9rem;line-height:1.6;color:#1e293b;">${m.text}</div>
          <button onclick="this.closest('div[style]').remove()" style="margin-top:16px;width:100%;padding:12px;background:#4ade80;color:white;border:none;border-radius:12px;font-weight:700;font-size:.9rem;cursor:pointer;">Tamam</button>
        </div>
      `;
      document.body.appendChild(overlay);
      // Mark as read
      m.read = true;
      localStorage.setItem(ADMIN_MSG_KEY, JSON.stringify(msgs));
    }, 1500);
  });
}

function renderAdminUsers() {
  const list = document.getElementById('adminUserList');
  const allUsers = getAuthUsers();
  const currentSession = getAuthSession();

  if (allUsers.length === 0) {
    list.innerHTML = '<div style="text-align:center;padding:32px;color:var(--muted);">Henüz kayıtlı kullanıcı yok.</div>';
    return;
  }

  list.innerHTML = allUsers.map(u => {
    const isActive   = u.id === currentSession;
    const isSuper    = !!u.isSuperAdmin;
    const badgeSuper = isSuper ? '<span style="background:#fef3c7;color:#d97706;font-size:.6rem;padding:2px 7px;border-radius:20px;margin-left:4px;font-weight:700;">⭐ Süper Admin</span>' : '';
    const badgeAdmin = (!isSuper && u.isAdmin) ? '<span style="background:#ede9fe;color:#7c3aed;font-size:.6rem;padding:2px 7px;border-radius:20px;margin-left:4px;font-weight:700;">Admin</span>' : '';
    const badgeAktif = isActive ? '<span style="background:#dcfce7;color:#16a34a;font-size:.6rem;padding:2px 7px;border-radius:20px;margin-left:4px;font-weight:700;">● Aktif</span>' : '';
    const avatarChar = (u.name || '?')[0].toUpperCase();
    const regDate    = u.createdAt ? new Date(u.createdAt).toLocaleDateString('tr-TR') : '—';
    // Get user progress from their saved data key
    const userDbKey = 'master_eng_v13_' + u.id;
    let userProgress = { words: 0, readings: 0, streak: 0, level: '—' };
    try {
      const udb = JSON.parse(localStorage.getItem(userDbKey) || 'null');
      if (udb) {
        userProgress.words    = (udb.stats?.learnedWords || udb.unknown?.length || 0);
        userProgress.readings = Object.keys(udb.stats?.completed || {}).length;
        userProgress.level    = udb.lvl || '—';
      }
    } catch(e) {}
    const progressBar = `<div style="display:flex;gap:12px;margin:8px 0;font-size:.72rem;color:var(--muted);">
      <span>🎯 <b style="color:var(--text)">${userProgress.level}</b></span>
      <span>🧠 <b style="color:var(--text)">${userProgress.words}</b> kelime</span>
      <span>📖 <b style="color:var(--text)">${userProgress.readings}</b> okuma</span>
    </div>`;
    return `
    <div class="admin-user-card">
      <div class="admin-user-header">
        <div class="admin-user-avatar" style="background:var(--lvl-main);color:#fff;font-weight:700;font-size:1.1rem;">${avatarChar}</div>
        <div class="admin-user-meta">
          <div class="admin-user-name">${u.name}${badgeSuper}${badgeAdmin}${badgeAktif}</div>
          <div class="admin-user-lvl">${u.email}${u.username ? ' · @' + u.username : ''} · Kayıt: ${regDate}</div>
        </div>
      </div>
      ${progressBar}
      <div class="admin-user-actions" style="margin-top:8px;">
        ${!isSuper ? `<button class="admin-btn-reset" onclick="adminDeleteUser('${u.id}')">🗑 Sil</button>` : ''}
        ${(!isSuper && !u.isAdmin) ? `<button class="admin-btn-view" onclick="adminToggleAdmin('${u.id}', true)">👑 Admin Yap</button>` : ''}
        ${(!isSuper && u.isAdmin) ? `<button class="admin-btn-view" onclick="adminToggleAdmin('${u.id}', false)" style="background:#fff3cd;color:#856404;">Admin Kaldır</button>` : ''}
        ${!isSuper ? `<button class="admin-btn-view" onclick="adminSendMsg('${u.id}', '${u.name}')" style="background:#e0f2fe;color:#0369a1;">💬 Mesaj</button>` : ''}
      </div>
    </div>`;
  }).join('');
}

function adminDeleteUser(id) {
  const users = getAuthUsers();
  const u = users.find(x => x.id === id);
  if (!u) return;
  if (u.isSuperAdmin) { notify('⛔ Süper admin silinemez.'); return; }
  if (!confirm(`"${u.name}" kullanıcısı silinsin mi?`)) return;
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users.filter(x => x.id !== id)));
  renderAdminUsers();
  notify('✅ Kullanıcı silindi.');
}

function adminToggleAdmin(id, makeAdmin) {
  const users = getAuthUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return;
  if (users[idx].isSuperAdmin) { notify('⛔ Süper admin değiştirilemez.'); return; }
  users[idx].isAdmin = makeAdmin;
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
  renderAdminUsers();
  notify(makeAdmin ? '👑 Admin yetkisi verildi.' : '⬇ Admin yetkisi kaldırıldı.');
}

function adminViewUser(id) {
  if (id === 'local_main') {
    const u = db;
    const info = `👤 Kullanıcı: ${u.profile?.name || '?'}
📊 Seviye: ${u.lvl}
🧠 Kelime kasası: ${u.unknown.length}
📖 Tamamlanan: ${Object.keys(u.stats.completed||{}).length}
🔥 Seri: ${streakCount()} gün
🎯 Quiz başarı: ${u.stats.total > 0 ? Math.round((u.stats.correct/u.stats.total)*100) : 0}%
💾 Veri boyutu: ${(JSON.stringify(u).length/1024).toFixed(1)} KB`;
    alert(info);
  }
}

function adminResetUserProgress(id) {
  if (id !== 'local_main') return;
  if (!confirm('Bu kullanıcının tüm ilerleme verisi silinecek (kelime kasası, quiz, streak). Profil bilgileri korunacak. Devam edilsin mi?')) return;
  db.unknown = [];
  db.readings = [];
  db.stats = { correct: 0, total: 0, completed: {} };
  db.weekActivity = {};
  db.todayWords = 0;
  save();
  notify('✅ Kullanıcı ilerlemesi sıfırlandı');
  renderAdminUsers();
}

function adminRemoveUser(id) {
  if (!confirm('Bu kullanıcı silinsin mi?')) return;
  let users = [];
  try { users = JSON.parse(localStorage.getItem('lv_admin_users') || '[]'); } catch(e) {}
  users = users.filter(u => u.id !== id);
  localStorage.setItem('lv_admin_users', JSON.stringify(users));
  renderAdminUsers();
  notify('✅ Kullanıcı silindi');
}

function renderAdminStats() {
  const allKeys = Object.keys(localStorage).filter(k => k.startsWith('master_eng') || k.startsWith('lv_'));
  const totalKB = allKeys.reduce((s,k) => s + (localStorage.getItem(k)||'').length, 0) / 1024;
  document.getElementById('adminStats').innerHTML = `
    <div class="admin-stat-mini"><div class="admin-stat-mini-val">${db.unknown.length}</div><div class="admin-stat-mini-lbl">Toplam Kelime</div></div>
    <div class="admin-stat-mini"><div class="admin-stat-mini-val">${db.readings.length}</div><div class="admin-stat-mini-lbl">Okuma Metni</div></div>
    <div class="admin-stat-mini"><div class="admin-stat-mini-val">${totalKB.toFixed(1)}KB</div><div class="admin-stat-mini-lbl">Depolama</div></div>
  `;
}

// ---- VERİ YÖNETİMİ ----
function renderAdminDataInfo() {
  document.getElementById('adminDictInfo').innerText = db.dictionary.length > 0
    ? `✅ ${db.dictionary.length} kelime yüklü` : '⚠️ Sözlük boş';
  document.getElementById('adminReadInfo').innerText = db.readings.length > 0
    ? `✅ ${db.readings.length} okuma metni yüklü` : '⚠️ Okuma metni yok';

  // Sınav bilgisi
  const sinavEl = document.getElementById('adminSinavInfo');
  if (!sinavEl) return;
  if (typeof sinavlarVerisi !== 'undefined' && sinavlarVerisi.length > 0) {
    sinavEl.innerHTML = `✅ <b>${sinavlarVerisi.length}</b> sınav yüklü`;
  } else {
    sinavEl.innerHTML = '⚠️ Sınav verisi yok — sinavlar.js yükleyin';
  }
}

function adminToggleSinavDetail() {
  const det = document.getElementById('adminSinavDetail');
  const btn = document.getElementById('adminSinavDetailBtn');
  const show = det.style.display === 'none';
  det.style.display = show ? 'block' : 'none';
  btn.textContent   = show ? 'Gizle' : 'Detay';
  if (!show) return;

  const list = document.getElementById('adminSinavList');
  list.innerHTML = '';
  if (typeof sinavlarVerisi === 'undefined' || sinavlarVerisi.length === 0) {
    list.innerHTML = '<div style="font-size:.8rem;color:var(--muted);">Yüklü sınav yok.</div>';
    return;
  }
  sinavlarVerisi.forEach(s => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:var(--bg);border-radius:8px;margin-bottom:6px;font-size:.8rem;';
    row.innerHTML = `<span>📋 ${s.sinav_adi}</span><span style="font-weight:700;color:var(--lvl-dark);">${s.sorular.length} soru</span>`;
    list.appendChild(row);
  });
}

function adminLoadJsonFile(type) {
  const map = { word: 'adminWordFile', read: 'adminReadFile', sinav: 'adminSinavFile' };
  document.getElementById(map[type] || 'adminWordFile').click();
}

/* ---- JSON FORMAT NORMALIZER ----
   Desteklenen kelime formatları:
   1) Uygulama iç format:  { w, tr, te, tt, de, dt, e1, e1t, e2, e2t }
   2) Gerçek JSON format:  { İngilizceKelime, TürkçeAnlam, İngilizceTür, TürkçeTür, ... }

   Desteklenen reading formatları:
   1) Uygulama iç format:  { lvl, title, en, tr, qs:[{q,A,B,C,D,correct}] }
   2) Gerçek JSON format:  { title, content, translation, questions:[{question,options,answer}] }
*/
// ---- KELIME KÖK BULMA (basit İngilizce stemmer) ----
// "abandoned" → ["abandoned","abandon","abandone"]
// "running"   → ["running","run","runne"]
// "takes"     → ["takes","take"]
function stemWord(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length < 3) return [w];
  const stems = new Set([w]);
  // -ing: running→run, taking→take, abandoning→abandon
  if (w.endsWith('ing') && w.length > 5) {
    const s = w.slice(0, -3);
    stems.add(s);           // run (double consonant case)
    stems.add(s + 'e');     // take
    if (s.length >= 3 && s[s.length - 1] === s[s.length - 2]) stems.add(s.slice(0, -1)); // running→run
  }
  // -ed: abandoned→abandon, used→use, stopped→stop
  if (w.endsWith('ed') && w.length > 4) {
    const s = w.slice(0, -2);
    stems.add(s);           // abandon
    stems.add(s + 'e');     // use
    if (s.length >= 3 && s[s.length - 1] === s[s.length - 2]) stems.add(s.slice(0, -1)); // stopped→stop
  }
  // -es: takes→take, goes→go
  if (w.endsWith('es') && w.length > 4) { stems.add(w.slice(0, -2)); stems.add(w.slice(0, -1)); }
  // -s: runs→run, takes→take
  if (w.endsWith('s') && !w.endsWith('ss') && w.length > 4) stems.add(w.slice(0, -1));
  // -er / -est: bigger→big, fastest→fast
  if (w.endsWith('er') && w.length > 4) { stems.add(w.slice(0, -2)); stems.add(w.slice(0, -2) + 'e'); }
  if (w.endsWith('est') && w.length > 5) { stems.add(w.slice(0, -3)); stems.add(w.slice(0, -3) + 'e'); }
  // -ly: quickly→quick
  if (w.endsWith('ly') && w.length > 4) stems.add(w.slice(0, -2));
  // -tion / -ation: examination→examine
  if (w.endsWith('ation') && w.length > 7) stems.add(w.slice(0, -5) + 'e');
  if (w.endsWith('tion') && w.length > 6)  stems.add(w.slice(0, -4));
  return [...stems];
}

// Kelimeni sözlükte ara — önce tam eşleşme, sonra kök tabanlı
function findDictWord(word) {
  if (!word || !db.dictionary.length) return null;
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!clean) return null;
  let match = db.dictionary.find(x => x.w === clean);
  if (match) return match;
  for (const stem of stemWord(clean)) {
    if (stem === clean) continue;
    match = db.dictionary.find(x => x.w === stem);
    if (match) return match;
  }
  return null;
}

function normalizeWord(raw) {
  // Zaten iç formatta mı?
  if (raw.w) return raw;
  // Gerçek JSON formatı (Türkçe alan adları)
  const cefrRaw = raw['Kelimenin Seviyesi'] || raw.level || raw.cefr || '';
  const entry = {
    w:   (raw['İngilizceKelime'] || raw.word || '').toLowerCase().trim(),
    tr:  raw['TürkçeAnlam']  || raw.turkish || raw.tr || '?',
    te:  raw['İngilizceTür'] || raw.typeEn  || raw.te || '',
    tt:  raw['TürkçeTür']    || raw.typeTr  || raw.tt || '',
    de:  raw['İngilizceTanım'] || raw.defEn || raw.de || '',
    dt:  raw['TürkçeTanım']    || raw.defTr || raw.dt || '',
    e1:  raw['ÖrnekCümle1_İngilizce'] || raw.ex1En || raw.e1 || '',
    e1t: raw['ÖrnekCümle1_Türkçe']    || raw.ex1Tr || raw.e1t || '',
    e2:  raw['ÖrnekCümle2_İngilizce'] || raw.ex2En || raw.e2 || '',
    e2t: raw['ÖrnekCümle2_Türkçe']    || raw.ex2Tr || raw.e2t || '',
  };
  if (cefrRaw) entry.cefr = cefrRaw.toUpperCase().trim();
  return entry;
}

function normalizeReading(raw) {
  // Zaten iç formatta mı?
  if (raw.en && raw.qs) return raw;

  // Gerçek JSON formatı: { title, content, translation, questions }
  // Seviyeyi title'ın başından çıkar: "A2 Airport" → cefr="A2", title="Airport"
  const fullTitle = raw.title || '';
  const lvlMatch  = fullTitle.match(/^(A1|A2|B1|B2|C1|C2|Sprout|Sapling|Tree|Forest|Mountain|Galaxy)\s+/i);
  const rawLvl    = lvlMatch ? lvlMatch[1] : 'A1';
  const title     = lvlMatch ? fullTitle.substring(lvlMatch[0].length) : fullTitle;

  // CEFR → level id dönüşümü (uygulama level id kullanıyor)
  const cefrToId = { A1:'Sprout', A2:'Sapling', B1:'Tree', B2:'Forest', C1:'Mountain', C2:'Galaxy' };
  const lvl = cefrToId[rawLvl.toUpperCase()] || rawLvl; // zaten level id ise olduğu gibi bırak

  // Soru dönüşümü: options dizisi → A/B/C/D, answer harfi → correct
  const qs = (raw.questions || []).map(q => {
    const opts = q.options || [];
    return {
      q:       q.question || q.q || '',
      A:       opts[0] || q.A || '',
      B:       opts[1] || q.B || '',
      C:       opts[2] || q.C || '',
      D:       opts[3] || q.D || '',
      correct: q.answer || q.correct || 'A',
    };
  });

  return {
    lvl,
    title,
    en: raw.content     || raw.en || '',
    tr: raw.translation || raw.tr || '',
    qs,
  };
}

function parseJsonWords(text) {
  const parsed = JSON.parse(text);
  const arr = Array.isArray(parsed) ? parsed
    : parsed.words || parsed.dictionary || parsed.kelimeler || [];
  return arr.map(normalizeWord).filter(w => w.w);
}

function parseJsonReadings(text) {
  const parsed = JSON.parse(text);
  const arr = Array.isArray(parsed) ? parsed
    : parsed.readings || parsed.stories || parsed.reading_data || [];
  return arr.map(normalizeReading).filter(r => r.title);
}

// Sınavlar dosyası yükle (Veri Durumu panelindeki 📂 butonu)
function handleSinavFile(input) {
  adminHandleFile(input, 'sinav');
}

function adminHandleFile(input, type) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const text = e.target.result.trim();

      if (type === 'sinav') {
        // sinavlar.js veya .json yükle — sinavlarVerisi global değişkenine ata
        let parsed;
        if (text.startsWith('[') || text.startsWith('{')) {
          parsed = JSON.parse(text);
        } else {
          // JS dosyası: "const sinavlarVerisi = [...];" satırını çalıştır
          const match = text.match(/=\s*(\[[\s\S]*\])\s*;?\s*(?:\/\/|$)/);
          if (match) parsed = JSON.parse(match[1]);
          else { notify('❌ sinavlar.js formatı tanınamadı'); return; }
        }
        if (!Array.isArray(parsed)) { notify('❌ Sınav verisi dizi olmalı'); return; }
        // Global değişkeni güncelle ve sınav havuzlarını yeniden yükle
        window.sinavlarVerisi = parsed;
        // Placement ve gate sorularını yeniden yükle
        if (typeof loadPlacementFromGlobal === 'function') loadPlacementFromGlobal();
        if (typeof loadGateFromGlobal === 'function') loadGateFromGlobal();
        notify(`✅ ${parsed.length} sınav yüklendi`);
        renderAdminDataInfo();
        renderAdminStats();
        return;
      }

      if (text.startsWith('[') || text.startsWith('{')) {
        if (type === 'word') {
          const arr = parseJsonWords(text);
          db.dictionary = arr;
          save();
          try { localStorage.setItem(DICT_CACHE_KEY, JSON.stringify(arr)); } catch(e) {}
          notify(`✅ ${arr.length} kelime yüklendi`);
        } else {
          const arr = parseJsonReadings(text);
          db.readings = arr;
          save();
          try { localStorage.setItem(READ_CACHE_KEY, JSON.stringify(arr)); } catch(e) {}
          notify(`✅ ${arr.length} okuma metni yüklendi`);
        }
      } else {
        processInput(text, type === 'word' ? 'word' : 'read');
      }
      renderAdminDataInfo();
      renderAdminStats();
    } catch(err) {
      notify('❌ Dosya okunamadı: ' + err.message);
      console.error(err);
    }
  };
  reader.readAsText(input.files[0]);
  input.value = '';
}

function adminClearData(type) {
  const label = type === 'word' ? 'sözlük verisi' : 'okuma metinleri';
  if (!confirm(`Tüm ${label} silinecek. Emin misiniz?`)) return;
  if (type === 'word') { db.dictionary = []; localStorage.removeItem(DICT_CACHE_KEY); }
  else { db.readings = []; localStorage.removeItem(READ_CACHE_KEY); }
  save();
  notify(`✅ ${label} temizlendi`);
  renderAdminDataInfo();
  renderAdminStats();
}

function adminExportAll() {
  const now = new Date();
  const ts = now.toISOString().replace(/[:.]/g,'-').slice(0,19);
  const data = {
    exportDate: now.toISOString(),
    appVersion: 'v20',
    userData: db,
    adminUsers: JSON.parse(localStorage.getItem('lv_admin_users') || '[]'),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `linguivance_admin_yedek_${ts}.json`;
  a.click();
  notify(`📥 Admin yedeği alındı: ${ts}`);
}

function adminResetEverything() {
  if (!confirm('⚠️ TÜM uygulama verisi silinecek! Bu işlem geri alınamaz. Devam edilsin mi?')) return;
  if (!confirm('Son onay: Gerçekten silmek istiyor musunuz?')) return;
  localStorage.clear();
  location.reload();
}

// ---- ADMIN ŞİFRE DEĞİŞTİR ----
function adminChangePw() {
  const p1 = document.getElementById('newAdminPw1').value;
  const p2 = document.getElementById('newAdminPw2').value;
  if (!p1) { notify('❌ Şifre boş olamaz'); return; }
  if (p1 !== p2) { notify('❌ Şifreler eşleşmiyor'); return; }
  if (p1.length < 6) { notify('❌ Şifre en az 6 karakter olmalı'); return; }
  localStorage.setItem(ADMIN_PW_KEY, p1);
  document.getElementById('newAdminPw1').value = '';
  document.getElementById('newAdminPw2').value = '';
  notify('✅ Admin şifresi güncellendi');
}

/* ============================================================
   V16 — JSON OTO-YÜKLEME SİSTEMİ
   Aynı klasörde kelimeler.json / reading.json varsa otomatik yükler
   ============================================================ */
// Sayfa yüklenince yükleme durumunu göster
// Not: fetch() file:// protokolünde çalışmaz.
// Veriyi Ayarlar ekranındaki butonlarla veya Admin Paneli → Veri Yönetimi ile yükleyin.
updateLoadStatus();

/* ============================================================
   ANDROID BACK BUTTON — History API
   Kullanıcı geri tuşuna basınca:
     1. Açık modal varsa → modal kapat
     2. immersive screen (quiz, card, reading) → ana ekrana dön
     3. Ana tab'da değilse → home'a git
     4. Home'daysa → default browser davranışı (uygulama minimize)
   ============================================================ */

// Bir state push et (ilk yükleme için baseline)
history.replaceState({ screen: 'home' }, '');

// show() fonksiyonunu sararak her ekran geçişini history'e kaydet
(function patchShow() {
  const _show = show;
  window.show = function(id) {
    _show(id);
    history.pushState({ screen: id }, '');
  };
})();

// tabGo de show'u çağırdığı için tabGo'yu da patch et
(function patchTabGo() {
  const _tabGo = tabGo;
  window.tabGo = function(tab) {
    _tabGo(tab);
    // tabGo içinde show() çağrısı zaten history push ediyor
  };
})();

window.addEventListener('popstate', function(e) {
  // 1. Açık modal varsa kapat
  const openModal = document.querySelector('.modal-overlay.active');
  if (openModal) {
    openModal.classList.remove('active');
    // Geri push ederek history'i yeniden dengeye getir
    history.pushState({ screen: e.state?.screen || 'home' }, '');
    return;
  }

  // 2. Reading modülü açıksa kapat
  if (document.getElementById('readMod')?.classList.contains('active')) {
    closeReadMod();
    history.pushState({ screen: 'readList' }, '');
    return;
  }

  // 3. Quiz/Card/Result gibi immersive screen'ler
  const immersive = ['quizScreen', 'cardScreen', 'resultScreen'];
  const activeImmersive = immersive.find(id => document.getElementById(id)?.classList.contains('active'));
  if (activeImmersive) {
    show('home');
    tabGo('home');
    return;
  }

  // 4. Home değilsek home'a git
  const currentActive = document.querySelector('.screen.active');
  if (currentActive && currentActive.id !== 'home') {
    show('home');
    tabGo('home');
    history.pushState({ screen: 'home' }, '');
    return;
  }

  // 5. Home'dayız → geri gitmesine izin ver (uygulama minimize olur)
});

