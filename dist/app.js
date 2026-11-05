const $ = selector => document.querySelector(selector);
const state = { collection: null, cards: [], filtered: [], selected: null, deck: '', query: '', tag: '', page: 0, face: 'front', media: new Map(), busy: false };
const PAGE_SIZE = 60;
let worker;
const icon = (name, cls = '') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
function plain(html) {
  const clean = DOMPurify.sanitize(String(html), { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  const doc = new DOMParser().parseFromString(clean, 'text/html');
  return doc.body.textContent.replace(/\[sound:[^\]]+\]/g, ' [音频] ').replace(/\{\{c\d+::(.*?)(?:::.*?)?\}\}/gs, '$1').replace(/\s+/g, ' ').trim();
}
function status(message, kind = '') {
  $('#status').hidden = !message;
  $('#status').className = `status-banner ${kind}`;
  $('#status span').textContent = message;
  $('#dismiss-status').hidden = kind === 'loading';
}
function setBusy(value) {
  state.busy = value;
  document.querySelectorAll('[data-import], #load-demo, #close-deck').forEach(button => { button.disabled = value; });
}
function importFile(file, demo = false) {
  if (!file || state.busy) return;
  if (!/\.(apkg|colpkg|anki2)$/i.test(file.name)) return status('请选择 .apkg、.colpkg 或 .anki2 文件。', 'error');
  if (file.size > 256 * 1024 * 1024) return status('文件超过 256 MB，请在 Anki 中按牌组分开导出后再打开。', 'error');
  setBusy(true); status('正在读取文件…', 'loading');
  worker = new Worker('parser-worker.js');
  worker.onmessage = ({ data }) => {
    if (data.status) return status(data.status, 'loading');
    setBusy(false); worker.terminate(); worker = null;
    if (data.error) return status(`读取失败：${data.error}`, 'error');
    openCollection(data.result, demo); status('');
  };
  worker.onerror = () => { setBusy(false); worker.terminate(); worker = null; status('解析器未能启动。请刷新网页后重新选择卡包。', 'error'); };
  file.arrayBuffer().then(buffer => worker.postMessage({ name: file.name, buffer }, [buffer])).catch(() => {
    worker.terminate(); worker = null; setBusy(false); status('无法读取这个文件，请重新选择卡包。', 'error');
  });
}
function releaseMedia() {
  for (const url of new Set(state.media.values())) URL.revokeObjectURL(url);
  state.media.clear();
}
function openCollection(collection, demo) {
  releaseMedia();
  const mimeTypes = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', avif: 'image/avif', mp3: 'audio/mpeg', ogg: 'audio/ogg', opus: 'audio/ogg', wav: 'audio/wav', m4a: 'audio/mp4', mp4: 'video/mp4', webm: 'video/webm', ttf: 'font/ttf', otf: 'font/otf', woff: 'font/woff', woff2: 'font/woff2' };
  for (const media of collection.media) {
    const type = mimeTypes[media.name.split('.').pop().toLowerCase()] || 'application/octet-stream';
    state.media.set(media.name, URL.createObjectURL(new Blob([media.buffer], { type })));
  }
  delete collection.media;
  state.collection = collection;
  const notes = new Map(collection.notes.map(note => [note.id, note]));
  state.cards = collection.cards.map(card => {
    const note = notes.get(card.nid), model = collection.models[note.mid];
    const fields = note.fields.map(plain);
    return { ...card, note, model, title: fields[0] || '图片或音频卡片', snippet: fields.slice(1).join(' · '), search: `${fields.join(' ')} ${note.tags.join(' ')} ${collection.decks[card.did] || ''}`.toLocaleLowerCase() };
  });
  state.deck = ''; state.query = ''; state.tag = ''; state.page = 0; state.selected = null; state.face = 'front';
  $('#search').value = '';
  $('#tag-filter').innerHTML = '<option value="">全部标签</option>' + [...new Set(collection.notes.flatMap(note => note.tags))].sort().map(tag => `<option value="${escapeHtml(tag)}">${escapeHtml(tag)}</option>`).join('');
  $('#welcome').hidden = true; $('#workspace').hidden = false; $('#demo-label').hidden = !demo;
  $('#file-crumb').textContent = collection.name;
  $('#collection-count').textContent = `${state.cards.length.toLocaleString()} 张卡片 · ${collection.notes.length.toLocaleString()} 条笔记`;
  $('#footer-format').textContent = '← → 切换卡片 · 空格查看答案';
  renderDecks(); filterCards();
}
function renderDecks() {
  const counts = new Map();
  for (const card of state.cards) {
    const name = state.collection.decks[card.did] || '未命名牌组';
    const parts = name.split('::');
    for (let i = 1; i <= parts.length; i++) { const key = parts.slice(0, i).join('::'); counts.set(key, (counts.get(key) || 0) + 1); }
  }
  $('#deck-nav').innerHTML = `<button class="deck-button ${state.deck === '' ? 'active' : ''}" data-deck="" aria-pressed="${state.deck === ''}">${icon('cards')}<span class="deck-name">全部卡片</span><span class="count">${state.cards.length}</span></button>` + [...counts].sort((a, b) => a[0].localeCompare(b[0])).map(([name, count]) => `<button class="deck-button ${state.deck === name ? 'active' : ''}" data-deck="${escapeHtml(name)}" aria-pressed="${state.deck === name}" title="${escapeHtml(name)}">${icon('folder')}<span class="deck-name">${escapeHtml(name.replaceAll('::', ' / '))}</span><span class="count">${count}</span></button>`).join('');
  $('#deck-title').textContent = state.deck ? state.deck.split('::').at(-1) : '全部卡片';
}
function filterCards() {
  const terms = state.query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  state.filtered = state.cards.filter(card => {
    const deck = state.collection.decks[card.did] || '未命名牌组';
    return (!state.deck || deck === state.deck || deck.startsWith(`${state.deck}::`)) && (!state.tag || card.note.tags.includes(state.tag)) && terms.every(term => card.search.includes(term));
  });
  state.page = 0;
  if (!state.filtered.some(card => card.id === state.selected)) { state.selected = state.filtered[0]?.id ?? null; state.face = 'front'; }
  else state.page = Math.floor(state.filtered.findIndex(card => card.id === state.selected) / PAGE_SIZE);
  renderList(); renderCard();
}
function renderList() {
  const start = state.page * PAGE_SIZE, shown = state.filtered.slice(start, start + PAGE_SIZE);
  $('#result-count').textContent = `${state.filtered.length.toLocaleString()} 张卡片`;
  $('#card-list').innerHTML = shown.length ? shown.map(card => `<div role="listitem"><button class="card-row ${card.id === state.selected ? 'selected' : ''}" data-card="${card.id}" aria-pressed="${card.id === state.selected}"><span class="card-row-title">${escapeHtml(card.title)}</span><span class="card-row-snippet">${escapeHtml(card.snippet || (card.model.type === 1 ? '填空卡片' : card.model.name))}</span><span class="card-row-meta"><span>${escapeHtml((state.collection.decks[card.did] || '未命名牌组').split('::').at(-1))}</span><span>${escapeHtml(card.model.type === 1 ? `填空 ${card.ord + 1}` : card.model.name)}</span></span></button></div>`).join('') : '<div class="empty-results">没有匹配的卡片<br>试试其他关键词或标签</div>';
  $('#page-indicator').textContent = state.filtered.length ? `${start + 1}–${Math.min(start + PAGE_SIZE, state.filtered.length)} / ${state.filtered.length}` : '0 张卡片';
  $('#page-prev').disabled = state.page === 0; $('#page-next').disabled = start + PAGE_SIZE >= state.filtered.length;
}
function renderCloze(value, ordinal, answer) {
  let output = '', pos = 0;
  const opener = /\{\{c(\d+)::/g;
  while (pos < value.length) {
    opener.lastIndex = pos;
    const found = opener.exec(value);
    if (!found) return output + value.slice(pos);
    output += value.slice(pos, found.index);
    let cursor = opener.lastIndex, depth = 1, end = -1;
    const tokens = /\{\{c\d+::|\}\}/g; tokens.lastIndex = cursor;
    for (let token; (token = tokens.exec(value));) {
      depth += token[0] === '}}' ? -1 : 1;
      if (!depth) { end = token.index; break; }
    }
    if (end < 0) return output + value.slice(found.index);
    const content = value.slice(cursor, end);
    let hintAt = -1, nesting = 0;
    for (let i = 0; i < content.length - 1; i++) {
      if (content.slice(i, i + 2) === '{{') nesting++;
      if (content.slice(i, i + 2) === '}}') nesting--;
      if (!nesting && content.slice(i, i + 2) === '::') hintAt = i;
    }
    const body = hintAt < 0 ? content : content.slice(0, hintAt), hint = hintAt < 0 ? '…' : content.slice(hintAt + 2);
    const target = Number(found[1]) === ordinal + 1;
    output += target ? `<span class="cloze">${answer ? renderCloze(body, ordinal, answer) : `[${hint}]`}</span>` : renderCloze(body, ordinal, answer);
    pos = end + 2;
  }
  return output;
}
function renderTemplate(template, card, answer, frontSide = '') {
  const values = Object.fromEntries(card.model.fields.map(field => [field.name, card.note.fields[field.ord] || '']));
  const deck = state.collection.decks[card.did] || '';
  Object.assign(values, { FrontSide: frontSide, Tags: card.note.tags.join(' '), Type: card.model.name, Deck: deck, Subdeck: deck.split('::').at(-1), Card: card.model.templates.find(tpl => tpl.ord === card.ord)?.name || '', CardFlag: '' });
  const view = {}, keys = new Map();
  const prepared = template.replace(/\{\{\{?([^{}]+?)\}\}\}?/g, (_, token) => {
    token = token.trim();
    const modifier = /^[#^/!]/.test(token) ? token[0] : '';
    if (modifier === '!') return '';
    const expression = modifier ? token.slice(1).trim() : token;
    if (!keys.has(expression)) {
      const key = `f${keys.size}`; keys.set(expression, key);
      const parts = expression.split(':'), name = parts.pop();
      let value = values[name] || '';
      if (/^c\d+$/.test(name)) value = Number(name.slice(1)) === card.ord + 1 ? '1' : '';
      for (const filter of parts.reverse()) {
        if (filter === 'cloze' || filter === 'cloze-only') value = renderCloze(value, card.ord, answer);
        else if (filter === 'text') value = escapeHtml(plain(value));
        else if (filter === 'hint') value = `<details><summary>${escapeHtml(name)}</summary>${value}</details>`;
        else if (filter === 'type') value = answer ? value : '<span class="typing-placeholder">在心中回答，再查看答案</span>';
        else if (filter === 'furigana') value = value.replace(/([^\s\[\]>]+)\[([^\]]+)\]/g, '<ruby>$1<rt>$2</rt></ruby>');
        else if (filter === 'kana') value = value.replace(/([^\s\[\]>]+)\[([^\]]+)\]/g, '$2');
        else if (filter === 'kanji') value = value.replace(/([^\s\[\]>]+)\[([^\]]+)\]/g, '$1');
        else card.unsupported = true;
      }
      view[key] = value;
    }
    return modifier ? `{{${modifier}${keys.get(expression)}}}` : `{{{${keys.get(expression)}}}}`;
  });
  return Mustache.render(prepared, view);
}
function mediaUrl(name) {
  const literal = name.replace(/^\.\//, '');
  if (state.media.has(literal)) return state.media.get(literal);
  if (/^(data:|blob:)/i.test(literal)) return literal;
  if (!/%/.test(literal)) return '';
  try { return state.media.get(decodeURIComponent(literal)) || ''; } catch { return ''; }
}
function mediaCss(css) {
  return css.replace(/@import\s+[^;]+;?/gi, '').replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi, (_, quote, path) => `url("${mediaUrl(path)}")`).replace(/<\/style/gi, '<\\/style');
}
function prepareContent(html) {
  html = html.replace(/\[sound:([^\]]+)\]/g, (_, name) => {
    const url = mediaUrl(name);
    return url ? `<a class="replay-button soundLink" role="button" tabindex="0" aria-label="重播音频"><svg class="playImage" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="29"></circle><path d="M56.502,32.301l-37.502,20.101l0.329,-40.804l37.173,20.703Z"></path></svg><audio preload="none" src="${url}"></audio></a>` : `<span class="missing-media">缺少音频：${escapeHtml(name)}</span>`;
  });
  const clean = DOMPurify.sanitize(html, { ADD_TAGS: ['audio', 'video', 'source'], ADD_ATTR: ['controls', 'preload'], ADD_URI_SAFE_ATTR: ['src', 'poster'], FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'link', 'meta'], FORBID_ATTR: ['srcset', 'autoplay'] });
  const doc = new DOMParser().parseFromString(clean, 'text/html');
  doc.querySelectorAll('[src], [poster]').forEach(element => {
    for (const attr of ['src', 'poster']) {
      if (!element.hasAttribute(attr)) continue;
      const value = element.getAttribute(attr), url = mediaUrl(value);
      if (url) element.setAttribute(attr, url);
      else { element.removeAttribute(attr); if (element.tagName === 'IMG') element.setAttribute('alt', `未包含图片：${value}`); }
    }
  });
  // Embedded audio controls are declarative playback targets. The host owns the
  // click handler; imported inline scripts remain removed by DOMPurify.
  doc.querySelectorAll('[data-reader-audio]').forEach(element => element.removeAttribute('data-reader-audio'));
  doc.querySelectorAll('button, a.replay-button').forEach(button => {
    const audio = button.querySelector('audio[src], audio:has(source[src])');
    if (button.tagName === 'BUTTON') button.type = 'button';
    if (audio) {
      button.setAttribute('data-reader-audio', '');
      audio.removeAttribute('controls');
      if (!button.getAttribute('aria-label')) button.setAttribute('aria-label', `播放 ${button.textContent.trim() || '音频'}`);
    }
  });
  doc.querySelectorAll('[style]').forEach(element => element.setAttribute('style', mediaCss(element.getAttribute('style'))));
  doc.querySelectorAll('a').forEach(element => {
    element.removeAttribute('href'); element.removeAttribute('target');
    if (element.hasAttribute('data-reader-audio')) element.setAttribute('href', '#');
  });
  return doc.body.innerHTML;
}
function frameDocument(body, css, ord) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src blob: data:; media-src blob: data:; font-src blob: data:; style-src 'unsafe-inline'; form-action 'none'; base-uri 'none'"><style>html{background:white;color:#203c33}body{margin:0;padding:18px 0 22px;overflow-wrap:anywhere;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Segoe UI',sans-serif;font-size:20px;line-height:1.75;text-align:center}*{box-sizing:border-box}img,video,audio{max-width:100%}img{height:auto}audio{display:block;margin:16px auto}hr{border:0;border-top:1px solid #dce5d7;margin:25px 0}.cloze{color:#48773c;font-weight:bold}.missing-media,.typing-placeholder{font-size:13px;color:#756444}details{font-size:16px}summary{cursor:pointer;color:#527142}pre{white-space:pre-wrap;text-align:left}table{max-width:100%}.fields{text-align:left;font-size:16px}.field{margin-bottom:24px}.field h3{font-size:11px;color:#697c60;margin:0 0 8px;font-weight:500}.field-value{border-bottom:1px solid #e5ebdd;padding-bottom:16px}.empty{font-size:14px;color:#718068;padding:50px 0}.replay-button{display:inline-flex;vertical-align:middle;text-decoration:none;margin:3px;cursor:pointer}.replay-button svg{width:40px;height:40px}.replay-button svg circle{fill:white;stroke:#414141}.replay-button svg path{fill:#414141}${mediaCss(css)}[data-reader-audio]{cursor:pointer}[data-reader-audio] audio{display:none!important}</style></head><body class="card card${ord + 1}">${body}</body></html>`;
}
function renderCard() {
  const index = state.filtered.findIndex(card => card.id === state.selected), card = state.filtered[index];
  $('#card-prev').disabled = index <= 0; $('#card-next').disabled = index < 0 || index === state.filtered.length - 1; $('#flip').disabled = !card;
  document.querySelectorAll('[data-face]').forEach(tab => { tab.setAttribute('aria-selected', String(tab.dataset.face === state.face)); tab.disabled = !card; });
  $('#card-position').textContent = card ? `${index + 1} / ${state.filtered.length}` : '';
  $('#flip').innerHTML = `${state.face === 'back' ? '返回正面' : '查看答案'}<span>空格</span>`;
  $('#render-note').hidden = true;
  $('#card-tags').innerHTML = card ? card.note.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('') : '';
  if (!card) { $('#card-caption').textContent = ''; $('#card-frame').srcdoc = frameDocument('<p class="empty">没有可预览的卡片</p>', '', 0); return; }
  const template = card.model.type === 1 ? card.model.templates[0] : card.model.templates.find(tpl => tpl.ord === card.ord);
  card.unsupported = false;
  let body, css = card.model.css;
  if (state.face === 'fields' || !template) {
    body = `<div class="fields">${card.model.fields.map(field => `<section class="field"><h3>${escapeHtml(field.name)}</h3><div class="field-value">${prepareContent(card.note.fields[field.ord] || '')}</div></section>`).join('')}</div>`; css = '';
  } else {
    const front = renderTemplate(template.front, card, false);
    body = prepareContent(state.face === 'back' ? renderTemplate(template.back, card, true, front) : front);
  }
  $('#card-caption').textContent = `${card.model.name} / ${template?.name || '原始字段'}`;
  const requiresScript = template && /<script|\{\{(?:tts|image-occlusion):|\[latex\]|\\\(|\\\[/.test(`${template.front}${template.back}${card.note.fields.join('')}`);
  if (card.unsupported || requiresScript || !template) {
    $('#render-note').textContent = '此模板可能包含脚本、公式或扩展语法；可切换“字段”查看原始内容。'; $('#render-note').hidden = false;
  }
  $('#card-frame').srcdoc = frameDocument(body, css, card.ord);
  $('#preview-scroll').scrollTop = 0;
}
function navigateCard(step) {
  const index = state.filtered.findIndex(card => card.id === state.selected), target = index + step;
  if (target < 0 || target >= state.filtered.length) return;
  state.selected = state.filtered[target].id; state.face = 'front'; state.page = Math.floor(target / PAGE_SIZE);
  renderList(); renderCard(); $('#card-list .selected')?.scrollIntoView({ block: 'nearest' });
}
$('#card-frame').addEventListener('load', () => {
  const frame = $('#card-frame');
  const resize = () => { frame.style.height = `${Math.max(240, frame.contentDocument.body.scrollHeight + 30)}px`; };
  const cardDocument = frame.contentDocument;
  cardDocument.addEventListener('click', event => {
    const button = event.target.closest('[data-reader-audio]');
    if (!button) return;
    event.preventDefault();
    const audio = button.querySelector('audio');
    audio.currentTime = 0;
    audio.play().catch(() => status('这个音频无法播放，请确认卡包中的音频文件完整且浏览器支持其格式。', 'error'));
  });
  cardDocument.addEventListener('keydown', event => {
    if (event.key === ' ' && event.target.matches('a[data-reader-audio]')) { event.preventDefault(); event.target.click(); }
  });
  cardDocument.querySelectorAll('audio').forEach(audio => audio.addEventListener('play', () => {
    cardDocument.querySelectorAll('audio').forEach(other => { if (other !== audio) other.pause(); });
  }));
  resize(); frame.contentDocument.querySelectorAll('img').forEach(img => img.addEventListener('load', resize, { once: true }));
});
document.querySelectorAll('[data-import]').forEach(button => button.addEventListener('click', () => $('#file-input').click()));
$('#file-input').addEventListener('change', event => { importFile(event.target.files[0]); event.target.value = ''; });
$('#dismiss-status').addEventListener('click', () => status(''));
$('#load-demo').addEventListener('click', () => {
  if (state.busy) return;
  setBusy(true); status('正在打开示例…', 'loading');
  fetch('sample.apkg').then(response => { if (!response.ok) throw new Error('示例暂不可用'); return response.blob(); }).then(blob => { setBusy(false); importFile(new File([blob], '植物的日常.apkg'), true); }).catch(() => { setBusy(false); status('示例加载失败，请直接选择你自己的卡包。', 'error'); });
});
$('#deck-nav').addEventListener('click', event => { const button = event.target.closest('[data-deck]'); if (!button) return; state.deck = button.dataset.deck; renderDecks(); filterCards(); });
$('#card-list').addEventListener('click', event => { const button = event.target.closest('[data-card]'); if (!button) return; state.selected = Number(button.dataset.card); state.face = 'front'; renderList(); renderCard(); });
$('#search').addEventListener('input', event => { state.query = event.target.value; filterCards(); });
$('#tag-filter').addEventListener('change', event => { state.tag = event.target.value; filterCards(); });
document.querySelectorAll('[data-face]').forEach(button => button.addEventListener('click', () => { state.face = button.dataset.face; renderCard(); }));
$('#flip').addEventListener('click', () => { state.face = state.face === 'back' ? 'front' : 'back'; renderCard(); });
$('#card-prev').addEventListener('click', () => navigateCard(-1)); $('#card-next').addEventListener('click', () => navigateCard(1));
$('#page-prev').addEventListener('click', () => { state.page--; renderList(); $('#card-list').scrollTop = 0; }); $('#page-next').addEventListener('click', () => { state.page++; renderList(); $('#card-list').scrollTop = 0; });
$('#close-deck').addEventListener('click', () => {
  releaseMedia(); state.collection = null; state.cards = []; state.filtered = []; state.selected = null;
  $('#card-frame').srcdoc = ''; $('#workspace').hidden = true; $('#welcome').hidden = false;
  $('#deck-nav').innerHTML = '<p class="side-empty">尚未导入卡包</p>'; $('#file-crumb').textContent = ''; $('#footer-format').textContent = '支持新旧版 Anki 卡包'; status('');
});
document.addEventListener('keydown', event => {
  if (!state.collection || event.target.closest('input,select,textarea,[contenteditable]')) return;
  if (event.key === '/') { event.preventDefault(); $('#search').focus(); }
  if (event.key === 'ArrowLeft') { event.preventDefault(); navigateCard(-1); }
  if (event.key === 'ArrowRight') { event.preventDefault(); navigateCard(1); }
  if (event.key === ' ' && state.selected !== null && !event.target.closest('button')) { event.preventDefault(); $('#flip').click(); }
});
let dragDepth = 0;
document.addEventListener('dragenter', event => { if (!event.dataTransfer.types.includes('Files') || state.busy) return; event.preventDefault(); dragDepth++; $('#drop-overlay').hidden = false; });
document.addEventListener('dragleave', () => { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) $('#drop-overlay').hidden = true; });
document.addEventListener('dragover', event => { if (event.dataTransfer.types.includes('Files')) event.preventDefault(); });
document.addEventListener('drop', event => { event.preventDefault(); dragDepth = 0; $('#drop-overlay').hidden = true; importFile(event.dataTransfer.files[0]); });
