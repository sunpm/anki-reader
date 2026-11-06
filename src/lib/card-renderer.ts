import DOMPurify from "dompurify";
import Mustache from "mustache";
import type { Face, ReaderCard } from "./anki";

const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => entities[char]);

export function plain(html: string) {
  const clean = DOMPurify.sanitize(String(html), { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  const doc = new DOMParser().parseFromString(clean, 'text/html');
  return (doc.body.textContent ?? "").replace(/\[sound:[^\]]+\]/g, ' [音频] ').replace(/\{\{c\d+::(.*?)(?:::.*?)?\}\}/gs, '$1').replace(/\s+/g, ' ').trim();
}
function renderCloze(value: string, ordinal: number, answer: boolean): string {
  let output = '', pos = 0;
  const opener = /\{\{c(\d+)::/g;
  while (pos < value.length) {
    opener.lastIndex = pos;
    const found = opener.exec(value);
    if (!found) return output + value.slice(pos);
    output += value.slice(pos, found.index);
    const cursor = opener.lastIndex; let depth = 1, end = -1;
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
function renderTemplate(template: string, card: ReaderCard, answer: boolean, frontSide = '') {
  const values = Object.fromEntries(card.model.fields.map(field => [field.name, card.note.fields[field.ord] || '']));
  const deck = card.deck;
  Object.assign(values, { FrontSide: frontSide, Tags: card.note.tags.join(' '), Type: card.model.name, Deck: deck, Subdeck: deck.split('::').at(-1), Card: card.model.templates.find(tpl => tpl.ord === card.ord)?.name || '', CardFlag: '' });
  const view: Record<string, string> = {}, keys = new Map<string, string>();
  let unsupported = false;
  const prepared = template.replace(/\{\{\{?([^{}]+?)\}\}\}?/g, (_, token: string) => {
    token = token.trim();
    const modifier = /^[#^/!]/.test(token) ? token[0] : '';
    if (modifier === '!') return '';
    const expression = modifier ? token.slice(1).trim() : token;
    if (!keys.has(expression)) {
      const key = `f${keys.size}`; keys.set(expression, key);
      const parts = expression.split(':'), name = parts.pop()!;
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
        else unsupported = true;
      }
      view[key] = value;
    }
    return modifier ? `{{${modifier}${keys.get(expression)}}}` : `{{{${keys.get(expression)}}}}`;
  });
  return { html: Mustache.render(prepared, view), unsupported };
}
export function createCardRenderer(media: Map<string, string>) {
  function mediaUrl(name: string): string {
    const literal = name.replace(/^\.\//, '');
    if (media.has(literal)) return media.get(literal)!;
    if (/^(data:|blob:)/i.test(literal)) return literal;
    if (!/%/.test(literal)) return '';
    try { return media.get(decodeURIComponent(literal)) || ''; } catch { return ''; }
  }
  function mediaCss(css: string) {
    return css.replace(/@import\s+[^;]+;?/gi, '').replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi, (_, _quote, path) => `url("${mediaUrl(path)}")`).replace(/<\/style/gi, '<\\/style');
  }
  function prepareContent(html: string) {
    html = html.replace(/\[sound:([^\]]+)\]/g, (_, name) => {
      const url = mediaUrl(name);
      return url ? `<a class="replay-button soundLink" role="button" tabindex="0" aria-label="重播音频"><svg class="playImage" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="29"></circle><path d="M56.502,32.301l-37.502,20.101l0.329,-40.804l37.173,20.703Z"></path></svg><audio preload="none" src="${url}"></audio></a>` : `<span class="missing-media">缺少音频：${escapeHtml(name)}</span>`;
    });
    const clean = DOMPurify.sanitize(html, { ADD_TAGS: ['audio', 'video', 'source'], ADD_ATTR: ['controls', 'preload'], ADD_URI_SAFE_ATTR: ['src', 'poster'], FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'link', 'meta'], FORBID_ATTR: ['srcset', 'autoplay'] });
    const doc = new DOMParser().parseFromString(clean, 'text/html');
    doc.querySelectorAll('[src], [poster]').forEach(element => {
      for (const attr of ['src', 'poster']) {
        if (!element.hasAttribute(attr)) continue;
        const value = element.getAttribute(attr)!, url = mediaUrl(value);
        if (url) element.setAttribute(attr, url);
        else { element.removeAttribute(attr); if (element.tagName === 'IMG') element.setAttribute('alt', `未包含图片：${value}`); }
      }
    });
    // Embedded audio controls are declarative playback targets. The host owns the
    // click handler; imported inline scripts remain removed by DOMPurify.
    doc.querySelectorAll('[data-reader-audio]').forEach(element => element.removeAttribute('data-reader-audio'));
    doc.querySelectorAll('button, a.replay-button').forEach(button => {
      const audio = button.querySelector('audio[src], audio:has(source[src])');
      if (button.tagName === 'BUTTON') button.setAttribute('type', 'button');
      if (audio) {
        button.setAttribute('data-reader-audio', '');
        audio.removeAttribute('controls');
        if (!button.getAttribute('aria-label')) button.setAttribute('aria-label', `播放 ${(button.textContent ?? "").trim() || '音频'}`);
      }
    });
    doc.querySelectorAll('[style]').forEach(element => element.setAttribute('style', mediaCss(element.getAttribute('style')!)));
    doc.querySelectorAll('a').forEach(element => {
      element.removeAttribute('href'); element.removeAttribute('target');
      if (element.hasAttribute('data-reader-audio')) element.setAttribute('href', '#');
    });
    return doc.body.innerHTML;
  }
  function frameDocument(body: string, css: string, ord: number) {
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src blob: data:; media-src blob: data:; font-src blob: data:; style-src 'unsafe-inline'; form-action 'none'; base-uri 'none'"><style>html{background:white;color:#302c29}body{margin:0;padding:18px 0 22px;overflow-wrap:anywhere;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Segoe UI',sans-serif;font-size:20px;line-height:1.75;text-align:center}*{box-sizing:border-box}img,video,audio{max-width:100%}img{height:auto}audio{display:block;margin:16px auto}hr{border:0;border-top:1px solid #e3ddd6;margin:25px 0}.cloze{color:#a44b30;font-weight:bold}.missing-media,.typing-placeholder{font-size:13px;color:#756c64}details{font-size:16px}summary{cursor:pointer;color:#a44b30}pre{white-space:pre-wrap;text-align:left}table{max-width:100%}.fields{text-align:left;font-size:16px}.field{margin-bottom:24px}.field h3{font-size:11px;color:#756c64;margin:0 0 8px;font-weight:500}.field-value{border-bottom:1px solid #e3ddd6;padding-bottom:16px}.empty{font-size:14px;color:#756c64;padding:50px 0}.replay-button{display:inline-flex;vertical-align:middle;text-decoration:none;margin:3px;cursor:pointer}.replay-button svg{width:40px;height:40px}.replay-button svg circle{fill:white;stroke:#414141}.replay-button svg path{fill:#414141}${mediaCss(css)}[data-reader-audio]{cursor:pointer}[data-reader-audio] audio{display:none!important}</style></head><body class="card card${ord + 1}">${body}</body></html>`;
  }

  return (card: ReaderCard | undefined, face: Face) => {
    if (!card) return { document: frameDocument('<p class="empty">没有可预览的卡片</p>', '', 0), caption: '', note: '' };
    const template = card.model.type === 1 ? card.model.templates[0] : card.model.templates.find((tpl) => tpl.ord === card.ord);
    let body: string, css = card.model.css, unsupported = false;
    if (face === 'fields' || !template) {
      body = `<div class="fields">${card.model.fields.map((field) => `<section class="field"><h3>${escapeHtml(field.name)}</h3><div class="field-value">${prepareContent(card.note.fields[field.ord] || '')}</div></section>`).join('')}</div>`;
      css = '';
    } else {
      const front = renderTemplate(template.front, card, false);
      const content = face === 'back' ? renderTemplate(template.back, card, true, front.html) : front;
      body = prepareContent(content.html);
      unsupported = front.unsupported || content.unsupported;
    }
    const requiresScript = template && /<script|\{\{(?:tts|image-occlusion):|\[latex\]|\\\(|\\\[/.test(`${template.front}${template.back}${card.note.fields.join('')}`);
    return {
      document: frameDocument(body, css, card.ord),
      caption: `${card.model.name} / ${template?.name || '原始字段'}`,
      note: unsupported || requiresScript || !template ? '此模板可能包含脚本、公式或扩展语法；可切换“字段”查看原始内容。' : '',
    };
  };
}
