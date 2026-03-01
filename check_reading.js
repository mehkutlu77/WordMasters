const fs = require('fs');
const code = fs.readFileSync('C:/Users/mehku/Desktop/Düzenlenmiş HTML kodlar/EngProNew/reading.js', 'utf8');

// Syntax kontrolü
let R;
try {
  const fn = new Function(code + '; return typeof READINGS !== "undefined" ? READINGS : typeof readingVerisi !== "undefined" ? readingVerisi : null;');
  R = fn();
} catch(e) {
  console.error('SYNTAX HATASI:', e.message);
  process.exit(1);
}

if (!R || !Array.isArray(R)) {
  console.error('HATA: READINGS veya readingVerisi dizisi bulunamadi');
  process.exit(1);
}

console.log('Syntax: OK');
console.log('Toplam metin:', R.length);

// Format tespiti (yeni mi eski mi)
const sample = R[0];
const isYeniFormat = !!(sample.content || sample.questions);
const isEskiFormat = !!(sample.en || sample.sorular || sample.qs);
console.log('Format:', isYeniFormat ? 'Yeni (content/questions)' : isEskiFormat ? 'Eski (en/sorular)' : 'Bilinmiyor');

// Detaylı hata kontrolü
let hatali = [];
R.forEach(function(r, i) {
  const issues = [];
  const title = r.title || r.name || '(başlıksız)';

  // Alan kontrolü (yeni format)
  if (isYeniFormat) {
    if (!r.content && !r.en) issues.push('İngilizce metin yok');
    if (!r.translation && !r.tr) issues.push('Türkçe çeviri yok');
    const qs = r.questions || r.sorular || [];
    if (qs.length === 0) issues.push('Soru yok');
    qs.forEach(function(q, qi) {
      const opts = q.options || [];
      if (opts.length !== 4) issues.push('Q'+(qi+1)+': '+opts.length+' seçenek (4 olmalı)');
      if (['A','B','C','D'].indexOf(q.answer) === -1) issues.push('Q'+(qi+1)+': geçersiz cevap="'+q.answer+'"');
    });
  }

  // Alan kontrolü (eski format)
  if (isEskiFormat) {
    if (!r.en) issues.push('en (İngilizce) yok');
    if (!r.tr) issues.push('tr (Türkçe) yok');
    const qs = r.qs || r.sorular || [];
    if (qs.length === 0) issues.push('Soru yok');
  }

  if (issues.length) hatali.push({ i: i, title: title, issues: issues });
});

if (hatali.length === 0) {
  console.log('Hata: YOK - tüm metinler tam ve doğru');
} else {
  console.log('Hatalı metin sayısı:', hatali.length);
  hatali.forEach(function(h) {
    console.log('  ['+h.i+'] "'+h.title+'" →', h.issues.join(' | '));
  });
}

// Seviye dağılımı
const lvls = {};
R.forEach(function(r) {
  const t = r.title || '';
  const m = t.match(/^(A1|A2|B1|B2|C1|C2)/);
  const lvl = m ? m[1] : (r.lvl || '?');
  lvls[lvl] = (lvls[lvl] || 0) + 1;
});
console.log('Seviye dağılımı:', JSON.stringify(lvls));
console.log('İlk metin:', JSON.stringify({ title: R[0].title, sorular: (R[0].questions||R[0].qs||[]).length }));
console.log('Son metin:', JSON.stringify({ title: R[R.length-1].title, sorular: (R[R.length-1].questions||R[R.length-1].qs||[]).length }));
