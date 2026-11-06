export interface NoteType {
  name: string;
  type: number;
  css: string;
  fields: { name: string; ord: number }[];
  templates: { name: string; ord: number; front: string; back: string }[];
}

export interface Note {
  id: number;
  mid: number;
  fields: string[];
  tags: string[];
}

export interface Card {
  id: number;
  nid: number;
  did: number;
  ord: number;
}

export interface Collection {
  name: string;
  notes: Note[];
  cards: Card[];
  models: Record<string, NoteType>;
  decks: Record<string, string>;
  media: { name: string; buffer: ArrayBuffer }[];
}

export interface ReaderCard extends Card {
  note: Note;
  model: NoteType;
  deck: string;
  title: string;
  snippet: string;
  search: string;
}

export type Face = "front" | "back" | "fields";
export type ParserRequest = { name: string; buffer: ArrayBuffer };
export type ParserResponse =
  | { status: string }
  | { error: string }
  | { result: Collection };
