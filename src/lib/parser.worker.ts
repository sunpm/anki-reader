/// <reference lib="webworker" />

import { unzipSync } from "fflate";
import { decompress } from "fzstd";
import { Reader } from "protobufjs/minimal";
import type initSqlJs from "sql.js";
import type { Database } from "sql.js";
import { z } from "zod";
import type { Collection, NoteType, ParserRequest, ParserResponse } from "./anki";

declare const self: DedicatedWorkerGlobalScope & { initSqlJs: typeof initSqlJs };

self.importScripts("/vendor/sql-wasm.js");
const sqlReady = self.initSqlJs({ locateFile: (file) => `/vendor/${file}` });
const textDecoder = new TextDecoder();
const id = z.number().int();
const fieldSchema = z.object({ name: z.string(), ord: z.number().int().optional() });
const legacyModelsSchema = z.record(z.string(), z.object({
  name: z.string(),
  type: z.number().int(),
  css: z.string().nullish(),
  flds: z.array(fieldSchema),
  tmpls: z.array(fieldSchema.extend({ qfmt: z.string().nullish(), afmt: z.string().nullish() })),
}));

function message(bytes: Uint8Array) {
  const reader = Reader.create(bytes);
  const fields = new Map<number, (Uint8Array | number)[]>();
  while (reader.pos < reader.len) {
    const tag = reader.uint32(), type = tag & 7, key = tag >>> 3;
    if (type === 2 || type === 0) {
      const value = type === 2 ? reader.bytes() : reader.uint32();
      const values = fields.get(key) ?? [];
      values.push(value);
      fields.set(key, values);
    } else reader.skipType(type);
  }
  return fields;
}

function protoBytes(value: Uint8Array | number) {
  if (!(value instanceof Uint8Array)) throw new Error("卡包中的 Protobuf 字段格式无法识别。");
  return value;
}

function protoString(fields: ReturnType<typeof message>, key: number) {
  const value = fields.get(key)?.[0];
  return value === undefined ? "" : textDecoder.decode(protoBytes(value));
}

function zstd(bytes: Uint8Array) {
  return bytes[0] === 0x28 && bytes[1] === 0xb5 && bytes[2] === 0x2f && bytes[3] === 0xfd
    ? decompress(bytes) : bytes;
}

// SQLite and legacy JSON are validated here; the UI only receives typed data.
function rows<T extends z.ZodType>(db: Database, query: string, schema: T): z.output<T>[] {
  const result = db.exec(query)[0];
  return result ? result.values.map((values) => schema.parse(
    Object.fromEntries(result.columns.map((key, i) => [key, values[i]])),
  )) : [];
}

function report(data: ParserResponse, transfer: Transferable[] = []) {
  self.postMessage(data, transfer);
}

self.onmessage = async ({ data }: MessageEvent<ParserRequest>) => {
  let db: Database | undefined;
  try {
    const bytes = new Uint8Array(data.buffer);
    report({ status: "正在解压卡包…" });
    let files: Record<string, Uint8Array> = {}, collection: Uint8Array;
    if (/\.anki2$/i.test(data.name)) collection = bytes;
    else {
      files = unzipSync(bytes);
      const fileName = ["collection.anki21b", "collection.anki21", "collection.anki2"].find((name) => files[name]);
      if (!fileName) throw new Error("没有找到 Anki 数据库。请选择 .apkg 或 .colpkg 卡包。");
      collection = zstd(files[fileName]);
    }
    if (textDecoder.decode(collection.subarray(0, 15)) !== "SQLite format 3") {
      throw new Error("卡包中的数据库无法识别，请重新从 Anki 导出。");
    }
    report({ status: "正在读取卡片…" });
    const SQL = await sqlReady;
    db = new SQL.Database(collection);
    const tables = new Set(rows(db, "SELECT name FROM sqlite_master WHERE type='table'", z.object({ name: z.string() })).map((row) => row.name));
    if (!tables.has("notes") || !tables.has("cards")) throw new Error("数据库缺少 Anki 卡片表。");
    const models: Record<string, NoteType> = {}, decks: Record<string, string> = {};
    if (tables.has("notetypes")) {
      for (const row of rows(db, "SELECT id, name, config FROM notetypes", z.object({ id, name: z.string(), config: z.instanceof(Uint8Array) }))) {
        const conf = message(row.config);
        models[row.id] = { name: row.name, type: z.number().parse(conf.get(1)?.[0] ?? 0), css: protoString(conf, 3), fields: [], templates: [] };
      }
      for (const row of rows(db, "SELECT ntid, ord, name FROM fields ORDER BY ntid, ord", z.object({ ntid: id, ord: id, name: z.string() }))) {
        models[row.ntid].fields.push({ name: row.name, ord: row.ord });
      }
      for (const row of rows(db, "SELECT ntid, ord, name, config FROM templates ORDER BY ntid, ord", z.object({ ntid: id, ord: id, name: z.string(), config: z.instanceof(Uint8Array) }))) {
        const conf = message(row.config);
        models[row.ntid].templates.push({ name: row.name, ord: row.ord, front: protoString(conf, 1), back: protoString(conf, 2) });
      }
      for (const row of rows(db, "SELECT id, name FROM decks", z.object({ id, name: z.string() }))) decks[row.id] = row.name.replace(/\x1f/g, "::");
    } else {
      const col = rows(db, "SELECT models, decks FROM col", z.object({ models: z.string(), decks: z.string() }))[0];
      if (!col) throw new Error("无法读取卡包的笔记类型。");
      const sourceModels = legacyModelsSchema.parse(JSON.parse(col.models));
      const sourceDecks = z.record(z.string(), z.object({ name: z.string() })).parse(JSON.parse(col.decks));
      for (const [key, model] of Object.entries(sourceModels)) {
        models[key] = {
          name: model.name, type: model.type, css: model.css ?? "",
          fields: model.flds.map((field, i) => ({ name: field.name, ord: field.ord ?? i })),
          templates: model.tmpls.map((tpl, i) => ({ name: tpl.name, ord: tpl.ord ?? i, front: tpl.qfmt ?? "", back: tpl.afmt ?? "" })),
        };
      }
      for (const [key, deck] of Object.entries(sourceDecks)) decks[key] = deck.name;
    }
    const notes = rows(db, "SELECT id, mid, flds, tags FROM notes", z.object({ id, mid: id, flds: z.string(), tags: z.string() })).map((note) => {
      if (!models[note.mid]) throw new Error("卡包缺少卡片使用的笔记类型。");
      return { id: note.id, mid: note.mid, fields: note.flds.split("\x1f"), tags: note.tags.trim().split(/\s+/).filter(Boolean) };
    });
    const cards = rows(db, "SELECT id, nid, did, ord FROM cards ORDER BY id", z.object({ id, nid: id, did: id, ord: id }));
    if (!cards.length) throw new Error("这个卡包没有卡片。请从 Anki 导出包含卡片的牌组。");
    const noteIds = new Set(notes.map((note) => note.id));
    if (cards.some((card) => !noteIds.has(card.nid))) throw new Error("卡包缺少卡片使用的笔记。");
    report({ status: "正在整理媒体…" });
    let mediaMap: [string, string][] = [];
    if (files.media) {
      const media = zstd(files.media);
      if (files["collection.anki21b"]) {
        mediaMap = (message(media).get(1) ?? []).map((entry, index) => {
          const m = message(protoBytes(entry));
          return [String(m.get(255)?.[0] ?? index), protoString(m, 1)];
        });
      } else mediaMap = Object.entries(z.record(z.string(), z.string()).parse(JSON.parse(textDecoder.decode(media))));
    }
    const media: Collection["media"] = [], transfers: ArrayBuffer[] = [];
    for (const [key, name] of mediaMap) {
      if (!files[key]) continue;
      const buffer = Uint8Array.from(zstd(files[key])).buffer;
      media.push({ name, buffer });
      transfers.push(buffer);
    }
    report({ result: { name: data.name, notes, cards, models, decks, media } }, transfers);
  } catch (error) {
    report({ error: error instanceof z.ZodError ? "卡包数据格式不完整，请重新从 Anki 导出。" : error instanceof Error ? error.message : "读取失败，请重新从 Anki 导出卡包。" });
  } finally {
    db?.close();
  }
};
