/* The archive boundary is normalized here; the UI receives one stable model. */
importScripts('vendor/sql-wasm.js', 'vendor/fflate.js', 'vendor/fzstd.js', 'vendor/protobuf.min.js');
const textDecoder = new TextDecoder();
const sqlReady = initSqlJs({ locateFile: file => `vendor/${file}` });
function message(bytes) {
  const reader = protobuf.Reader.create(bytes), fields = new Map();
  while (reader.pos < reader.len) {
    const tag = reader.uint32(), type = tag & 7, key = tag >>> 3;
    if (type === 2 || type === 0) {
      const value = type === 2 ? reader.bytes() : reader.uint32();
      if (!fields.has(key)) fields.set(key, []);
      fields.get(key).push(value);
    } else reader.skipType(type);
  }
  return fields;
}
const str = (fields, key) => fields.has(key) ? textDecoder.decode(fields.get(key)[0]) : '';
const zstd = bytes => bytes?.[0] === 0x28 && bytes[1] === 0xb5 && bytes[2] === 0x2f && bytes[3] === 0xfd ? fzstd.decompress(bytes) : bytes;
function rows(db, query) {
  const result = db.exec(query)[0];
  return result ? result.values.map(values => Object.fromEntries(result.columns.map((key, i) => [key, values[i]]))) : [];
}
self.onmessage = async ({ data }) => {
  let db;
  try {
    const bytes = new Uint8Array(data.buffer);
    self.postMessage({ status: '正在解压卡包…' });
    let files = {}, collection;
    if (/\.anki2$/i.test(data.name)) collection = bytes;
    else {
      files = fflate.unzipSync(bytes);
      const fileName = ['collection.anki21b', 'collection.anki21', 'collection.anki2'].find(name => files[name]);
      if (!fileName) throw new Error('没有找到 Anki 数据库。请选择 .apkg 或 .colpkg 卡包。');
      collection = zstd(files[fileName]);
    }
    if (textDecoder.decode(collection.subarray(0, 15)) !== 'SQLite format 3') throw new Error('卡包中的数据库无法识别，请重新从 Anki 导出。');
    self.postMessage({ status: '正在读取卡片…' });
    const SQL = await sqlReady;
    db = new SQL.Database(collection);
    const tables = new Set(rows(db, "SELECT name FROM sqlite_master WHERE type='table'").map(row => row.name));
    if (!tables.has('notes') || !tables.has('cards')) throw new Error('数据库缺少 Anki 卡片表。');
    const models = {}, decks = {};
    if (tables.has('notetypes')) {
      for (const row of rows(db, 'SELECT id, name, config FROM notetypes')) {
        const conf = message(row.config);
        models[row.id] = { id: row.id, name: row.name, type: conf.get(1)?.[0] || 0, css: str(conf, 3), fields: [], templates: [] };
      }
      for (const row of rows(db, 'SELECT ntid, ord, name FROM fields ORDER BY ntid, ord')) models[row.ntid].fields.push({ name: row.name, ord: row.ord });
      for (const row of rows(db, 'SELECT ntid, ord, name, config FROM templates ORDER BY ntid, ord')) {
        const conf = message(row.config);
        models[row.ntid].templates.push({ name: row.name, ord: row.ord, front: str(conf, 1), back: str(conf, 2) });
      }
      for (const row of rows(db, 'SELECT id, name FROM decks')) decks[row.id] = row.name.replace(/\x1f/g, '::');
    } else {
      const col = rows(db, 'SELECT models, decks FROM col')[0];
      if (!col) throw new Error('无法读取卡包的笔记类型。');
      const sourceModels = JSON.parse(col.models), sourceDecks = JSON.parse(col.decks);
      for (const [id, model] of Object.entries(sourceModels)) {
        if (!Array.isArray(model.flds) || !Array.isArray(model.tmpls)) throw new Error('卡包中的笔记类型不完整。');
        models[id] = { id, name: String(model.name), type: model.type, css: String(model.css || ''), fields: model.flds.map((field, i) => ({ name: String(field.name), ord: field.ord ?? i })), templates: model.tmpls.map((tpl, i) => ({ name: String(tpl.name), ord: tpl.ord ?? i, front: String(tpl.qfmt || ''), back: String(tpl.afmt || '') })) };
      }
      for (const [id, deck] of Object.entries(sourceDecks)) decks[id] = String(deck.name);
    }
    const notes = rows(db, 'SELECT id, mid, flds, tags FROM notes');
    const cards = rows(db, 'SELECT id, nid, did, ord FROM cards ORDER BY id');
    if (!cards.length) throw new Error('这个卡包没有卡片。请从 Anki 导出包含卡片的牌组。');
    for (const note of notes) {
      if (!models[note.mid]) throw new Error('卡包缺少卡片使用的笔记类型。');
      note.fields = note.flds.split('\x1f');
      note.tags = note.tags.trim().split(/\s+/).filter(Boolean);
      delete note.flds;
    }
    self.postMessage({ status: '正在整理媒体…' });
    let mediaMap = [];
    if (files.media) {
      const media = zstd(files.media);
      if (files['collection.anki21b']) {
        mediaMap = (message(media).get(1) || []).map((entry, index) => { const m = message(entry); return [String(m.get(255)?.[0] ?? index), str(m, 1)]; });
      } else mediaMap = Object.entries(JSON.parse(textDecoder.decode(media)));
    }
    const media = [], transfers = [];
    for (const [key, name] of mediaMap) {
      if (!files[key]) continue;
      const value = zstd(files[key]);
      const buffer = value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
      media.push({ name, buffer }); transfers.push(buffer);
    }
    self.postMessage({ result: { name: data.name, notes, cards, models, decks, media } }, transfers);
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : '读取失败，请重新从 Anki 导出卡包。' });
  } finally { db?.close(); }
};
