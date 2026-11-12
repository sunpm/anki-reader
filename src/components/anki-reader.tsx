"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { BookOpen, ChevronLeft, ChevronRight, CircleAlert, Folder, Layers, Plus, Search, ShieldCheck, Upload, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Card } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Kbd } from "@/components/ui/kbd";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarProvider } from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CardPreview } from "@/components/card-preview";
import type { Collection, Face, ParserResponse, ReaderCard } from "@/lib/anki";
import { plain } from "@/lib/card-renderer";

interface Session {
  collection: Omit<Collection, "media">;
  cards: ReaderCard[];
  media: Map<string, string>;
  demo: boolean;
}

interface View {
  deck: string;
  query: string;
  tag: string;
  selected: number | null;
  face: Face;
  page: number;
}

const PAGE_SIZE = 60;
const initialView: View = { deck: "", query: "", tag: "", selected: null, face: "front", page: 0 };
const mimeTypes: Record<string, string> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp",
  svg: "image/svg+xml", avif: "image/avif", mp3: "audio/mpeg", ogg: "audio/ogg", opus: "audio/ogg",
  wav: "audio/wav", m4a: "audio/mp4", mp4: "video/mp4", webm: "video/webm", ttf: "font/ttf",
  otf: "font/otf", woff: "font/woff", woff2: "font/woff2",
};

function filterCards(cards: ReaderCard[], filters: Pick<View, "deck" | "query" | "tag">) {
  const terms = filters.query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return cards.filter((card) =>
    (!filters.deck || card.deck === filters.deck || card.deck.startsWith(`${filters.deck}::`)) &&
    (!filters.tag || card.note.tags.includes(filters.tag)) && terms.every((term) => card.search.includes(term)),
  );
}

export function AnkiReader() {
  const [session, setSession] = useState<Session | null>(null);
  const [view, setView] = useState<View>(initialView);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ message: string; kind: "loading" | "error" } | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const worker = useRef<Worker | null>(null);
  const { deck, query, tag } = view;
  const filtered = useMemo(() => filterCards(session?.cards ?? [], { deck, query, tag }), [session, deck, query, tag]);
  const index = filtered.findIndex((card) => card.id === view.selected);
  const card = filtered[index];
  const start = view.page * PAGE_SIZE;
  const deckCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const card of session?.cards ?? []) {
      const parts = card.deck.split("::");
      for (let i = 1; i <= parts.length; i++) {
        const key = parts.slice(0, i).join("::");
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    return [...counts].sort(([a], [b]) => a.localeCompare(b));
  }, [session]);
  const tags = useMemo(() => [...new Set(session?.collection.notes.flatMap((note) => note.tags))].sort(), [session]);
  const showError = useCallback((message: string) => setStatus({ message, kind: "error" }), []);
  const handleSearchShortcut = useCallback((event: KeyboardEvent) => {
    if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
    if ((event.target as Element).closest("input,textarea,[contenteditable],[role=listbox]")) return;
    event.preventDefault();
    searchInput.current?.focus();
  }, []);

  useEffect(() => () => { worker.current?.terminate(); }, []);
  useEffect(() => () => {
    for (const url of session?.media.values() ?? []) URL.revokeObjectURL(url);
  }, [session]);

  const importFile = useCallback((file: File | undefined, demo = false) => {
    if (!file || busy) return;
    if (!/\.(apkg|colpkg|anki2)$/i.test(file.name)) return showError("请选择 .apkg、.colpkg 或 .anki2 文件。");
    if (file.size > 256 * 1024 * 1024) return showError("文件超过 256 MB，请在 Anki 中按牌组分开导出后再打开。");
    setBusy(true);
    setStatus({ message: "正在读取文件…", kind: "loading" });
    const parser = new Worker(new URL("../lib/parser.worker.ts", import.meta.url));
    worker.current = parser;
    parser.onmessage = ({ data }: MessageEvent<ParserResponse>) => {
      if ("status" in data) return setStatus({ message: data.status, kind: "loading" });
      parser.terminate();
      worker.current = null;
      setBusy(false);
      if ("error" in data) return showError(`读取失败：${data.error}`);
      const { media: files, ...collection } = data.result;
      const media = new Map(files.map((file) => [file.name, URL.createObjectURL(new Blob([file.buffer], {
        type: mimeTypes[file.name.split(".").pop()!.toLowerCase()] ?? "application/octet-stream",
      }))]));
      const notes = new Map(collection.notes.map((note) => [note.id, note]));
      const cards = collection.cards.map((card) => {
        const note = notes.get(card.nid)!, model = collection.models[note.mid];
        const fields = note.fields.map(plain), deck = collection.decks[card.did] || "未命名牌组";
        return {
          ...card, note, model, deck, title: fields[0] || "图片或音频卡片", snippet: fields.slice(1).join(" · "),
          search: `${fields.join(" ")} ${note.tags.join(" ")} ${deck}`.toLocaleLowerCase(),
        };
      });
      setView({ ...initialView, selected: cards[0].id });
      setSession({ collection, cards, media, demo });
      setStatus(null);
    };
    parser.onerror = () => {
      parser.terminate(); worker.current = null; setBusy(false);
      showError("解析器未能启动。请刷新网页后重新选择卡包。");
    };
    file.arrayBuffer().then((buffer) => parser.postMessage({ name: file.name, buffer }, [buffer])).catch(() => {
      parser.terminate(); worker.current = null; setBusy(false);
      showError("无法读取这个文件，请重新选择卡包。");
    });
  }, [busy, showError]);

  function loadDemo() {
    if (busy) return;
    setBusy(true);
    setStatus({ message: "正在打开示例…", kind: "loading" });
    fetch("/sample.apkg").then((response) => {
      if (!response.ok) throw new Error("示例暂不可用");
      return response.blob();
    }).then((blob) => importFile(new File([blob], "植物的日常.apkg"), true)).catch(() => {
      setBusy(false);
      showError("示例加载失败，请直接选择你自己的卡包。");
    });
  }

  function changeFilters(patch: Partial<Pick<View, "deck" | "query" | "tag">>) {
    setView((current) => {
      const next = { ...current, ...patch };
      const matches = filterCards(session!.cards, next);
      const selectedIndex = matches.findIndex((card) => card.id === current.selected);
      return {
        ...next,
        selected: selectedIndex < 0 ? matches[0]?.id ?? null : current.selected,
        face: selectedIndex < 0 ? "front" : current.face,
        page: Math.floor(Math.max(0, selectedIndex) / PAGE_SIZE),
      };
    });
  }

  const navigateCard = useCallback((step: number) => {
    const target = index + step;
    if (target < 0 || target >= filtered.length) return;
    setView((current) => ({ ...current, selected: filtered[target].id, face: "front", page: Math.floor(target / PAGE_SIZE) }));
  }, [filtered, index]);

  useEffect(() => {
    list.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: "nearest" });
  }, [view.selected]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!session) return;
      handleSearchShortcut(event);
      if ((event.target as Element).closest("input,select,textarea,[contenteditable],[role=listbox]")) return;
      if ((event.target as Element).closest("button,[role=tab]")) return;
      if (event.key === "ArrowLeft") { event.preventDefault(); navigateCard(-1); }
      if (event.key === "ArrowRight") { event.preventDefault(); navigateCard(1); }
      if (event.key === " " && card) {
        event.preventDefault();
        setView((current) => ({ ...current, face: current.face === "back" ? "front" : "back" }));
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [session, navigateCard, card, handleSearchShortcut]);

  useEffect(() => {
    let depth = 0;
    const onEnter = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes("Files") || busy) return;
      event.preventDefault(); depth++; setDragging(true);
    };
    const onLeave = () => { depth = Math.max(0, depth - 1); if (!depth) setDragging(false); };
    const onOver = (event: DragEvent) => { if (event.dataTransfer?.types.includes("Files")) event.preventDefault(); };
    const onDrop = (event: DragEvent) => {
      event.preventDefault(); depth = 0; setDragging(false); importFile(event.dataTransfer?.files[0]);
    };
    document.addEventListener("dragenter", onEnter);
    document.addEventListener("dragleave", onLeave);
    document.addEventListener("dragover", onOver);
    document.addEventListener("drop", onDrop);
    return () => {
      document.removeEventListener("dragenter", onEnter);
      document.removeEventListener("dragleave", onLeave);
      document.removeEventListener("dragover", onOver);
      document.removeEventListener("drop", onDrop);
    };
  }, [busy, importFile]);

  const chooseFile = () => fileInput.current?.click();
  return <SidebarProvider className="grid grid-cols-[220px_minmax(0,1fr)] max-[1050px]:grid-cols-[184px_minmax(0,1fr)] max-[760px]:block">
    <Sidebar collapsible="none" role="complementary" aria-label="卡包导航" className="reader-sidebar sticky top-0 h-dvh w-full max-[760px]:static max-[760px]:h-auto">
      <SidebarHeader className="gap-8 p-0">
        <Link className="brand" href="/" aria-label="拾卡首页" onClick={() => { if (!busy) { setSession(null); setView(initialView); setStatus(null); } }}>
          <Image className="brand-icon" src="/icon.svg" alt="" width={40} height={40} unoptimized /><span>拾卡<span className="brand-en">Anki Reader</span></span>
        </Link>
        <Button size="lg" className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 max-[760px]:hidden" disabled={busy} onClick={chooseFile}><Plus />导入卡包</Button>
      </SidebarHeader>
      <SidebarContent className={`mt-6 max-[760px]:mt-3 ${session ? "" : "max-[760px]:hidden"}`}>
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="max-[760px]:hidden">卡包</SidebarGroupLabel>
          <SidebarGroupContent>
            {session ? <nav aria-label="牌组">
              <SidebarMenu className="max-[760px]:w-max max-[760px]:flex-row">
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={!view.deck} aria-pressed={!view.deck} onClick={() => changeFilters({ deck: "" })} className="pr-10">
                    <Layers /><span>全部卡片</span>
                  </SidebarMenuButton>
                  <SidebarMenuBadge>{session.cards.length}</SidebarMenuBadge>
                </SidebarMenuItem>
                {deckCounts.map(([name, count]) => <SidebarMenuItem key={name}>
                  <SidebarMenuButton isActive={view.deck === name} aria-pressed={view.deck === name} title={name} onClick={() => changeFilters({ deck: name })} className="pr-10">
                    <Folder /><span>{name.replaceAll("::", " / ")}</span>
                  </SidebarMenuButton>
                  <SidebarMenuBadge>{count}</SidebarMenuBadge>
                </SidebarMenuItem>)}
              </SidebarMenu>
            </nav> : <p className="px-2 py-3 text-xs text-sidebar-foreground/70">尚未导入卡包</p>}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="mt-auto px-2 pt-5 max-[760px]:hidden">
        <div className="flex items-center gap-2 text-xs text-sidebar-foreground/70"><ShieldCheck className="size-4" />文件仅在本地处理</div>
      </SidebarFooter>
    </Sidebar>
    <SidebarInset className="main">
      <header className="topbar">
        <Breadcrumb className="min-w-0">
          <BreadcrumbList className="flex-nowrap">
            <BreadcrumbItem className="shrink-0"><Layers className="size-4" /><span>卡包浏览器</span></BreadcrumbItem>
            {session && <>
              <BreadcrumbSeparator />
              <BreadcrumbItem className="min-w-0"><BreadcrumbPage className="max-w-70 truncate max-[760px]:max-w-32" title={session.collection.name}>{session.collection.name}</BreadcrumbPage></BreadcrumbItem>
            </>}
          </BreadcrumbList>
        </Breadcrumb>
        <Button variant="ghost" size="sm" disabled={busy} onClick={chooseFile}><Plus />导入卡包</Button>
      </header>
      {status && <Alert variant={status.kind === "error" ? "destructive" : "default"} role={status.kind === "error" ? "alert" : "status"} className="rounded-none border-x-0 border-t-0 pr-14">
        {status.kind === "loading" ? <Spinner aria-hidden="true" /> : <CircleAlert />}
        <AlertDescription>{status.message}</AlertDescription>
        {status.kind === "error" && <Button variant="ghost" size="icon-sm" className="absolute top-1/2 -translate-y-1/2 right-3" aria-label="关闭提示" onClick={() => setStatus(null)}><X /></Button>}
      </Alert>}
      {!session ? <section className="welcome">
        <h1>打开你的<br /><span>Anki 卡包。</span></h1>
        <Empty className="border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon"><Upload /></EmptyMedia>
            <EmptyTitle>将卡包拖到这里</EmptyTitle>
            <EmptyDescription>.apkg / .colpkg / .anki2 · 最大 256 MB</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="lg" disabled={busy} onClick={chooseFile}>选择卡包<ChevronRight /></Button>
            <span className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4" />本地读取，无需上传</span>
          </EmptyContent>
        </Empty>
        <Item className="mt-4 rounded-lg border bg-card/60 px-4 py-3 hover:bg-card">
          <ItemMedia variant="icon"><BookOpen /></ItemMedia>
          <ItemContent><ItemTitle>植物的日常</ItemTitle><ItemDescription>12 张植物学示例卡片</ItemDescription></ItemContent>
          <ItemActions><Button variant="ghost" size="sm" disabled={busy} onClick={loadDemo}>打开示例<ChevronRight /></Button></ItemActions>
        </Item>
      </section> : <section className="workspace" aria-busy={busy}>
        <div className="workspace-heading">
          <div>
            <div className="title-line"><h1>{view.deck ? view.deck.split("::").at(-1) : "全部卡片"}</h1>{session.demo && <Badge variant="outline">示例卡包</Badge>}</div>
            <p>{session.cards.length.toLocaleString()} 张卡片 · {session.collection.notes.length.toLocaleString()} 条笔记</p>
          </div>
          <Button variant="ghost" size="sm" className="text-muted-foreground" disabled={busy} onClick={() => { setSession(null); setView(initialView); setStatus(null); }}>关闭卡包</Button>
        </div>
        <Card className="browser-panel grid gap-0 overflow-hidden py-0 shadow-none">
          <section className="list-pane" aria-label="卡片列表">
            <div className="list-tools">
              <InputGroup className="bg-card">
                <InputGroupInput ref={searchInput} type="text" role="searchbox" aria-label="搜索卡片内容" aria-keyshortcuts="/" placeholder="搜索卡片内容…" value={view.query} onChange={(event) => changeFilters({ query: event.target.value })} />
                <InputGroupAddon><Search /></InputGroupAddon>
                <InputGroupAddon align="inline-end">
                  {view.query ? <InputGroupButton size="icon-xs" aria-label="清空搜索" onClick={() => { changeFilters({ query: "" }); searchInput.current?.focus(); }}><X /></InputGroupButton> : <Kbd>/</Kbd>}
                </InputGroupAddon>
              </InputGroup>
              <div className="mt-3 flex items-center justify-between gap-3">
                <Select value={view.tag ? `tag:${view.tag}` : "all"} onValueChange={(value) => changeFilters({ tag: value === "all" ? "" : value.slice(4) })}>
                  <SelectTrigger aria-label="按标签筛选" className="min-w-0 max-w-[62%] bg-card"><SelectValue /></SelectTrigger>
                  <SelectContent position="popper" align="start">
                    <SelectItem value="all">全部标签</SelectItem>
                    {tags.map((tag) => <SelectItem key={tag} value={`tag:${tag}`}>{tag}</SelectItem>)}
                  </SelectContent>
                </Select>
                <span className="shrink-0 text-xs text-muted-foreground" aria-live="polite">{filtered.length.toLocaleString()} 张卡片</span>
              </div>
            </div>
            <ScrollArea ref={list} className="reader-scroll min-h-0 flex-1 max-[760px]:h-60 max-[760px]:flex-none">
              {filtered.length ? <ItemGroup aria-label="搜索结果">
                {filtered.slice(start, start + PAGE_SIZE).map((item) => <div role="listitem" key={item.id}>
                  <Item size="sm" asChild className="w-full rounded-none border-0 text-left transition-colors hover:bg-accent/50 aria-pressed:bg-accent aria-pressed:hover:bg-accent focus-visible:ring-inset">
                    <button type="button" aria-pressed={item.id === view.selected} onClick={() => setView((current) => ({ ...current, selected: item.id, face: "front" }))}>
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="truncate text-sm font-medium">{item.title}</span>
                        <span className="truncate text-xs text-muted-foreground">{item.snippet || (item.model.type === 1 ? "填空卡片" : item.model.name)}</span>
                        <span className="mt-1 flex justify-between gap-2 text-xs text-muted-foreground"><span className="truncate">{item.deck.split("::").at(-1)}</span><span className="truncate">{item.model.type === 1 ? `填空 ${item.ord + 1}` : item.model.name}</span></span>
                      </span>
                    </button>
                  </Item>
                  <Separator />
                </div>)}
              </ItemGroup> : <Empty className="py-12"><EmptyTitle className="text-sm text-muted-foreground">没有匹配的卡片</EmptyTitle></Empty>}
            </ScrollArea>
            <Separator />
            <div className="flex items-center justify-between gap-2 px-4 py-2">
              <span className="text-xs text-muted-foreground tabular-nums">{filtered.length ? `${start + 1}–${Math.min(start + PAGE_SIZE, filtered.length)} / ${filtered.length}` : "0 张卡片"}</span>
              <Pagination aria-label="卡片列表分页" className="mx-0 w-auto">
                <PaginationContent>
                  <PaginationItem><Button variant="ghost" size="icon-sm" aria-label="上一页" disabled={view.page === 0} onClick={() => { setView((current) => ({ ...current, page: current.page - 1 })); list.current?.querySelector('[data-slot="scroll-area-viewport"]')?.scrollTo(0, 0); }}><ChevronLeft /></Button></PaginationItem>
                  <PaginationItem><Button variant="ghost" size="icon-sm" aria-label="下一页" disabled={start + PAGE_SIZE >= filtered.length} onClick={() => { setView((current) => ({ ...current, page: current.page + 1 })); list.current?.querySelector('[data-slot="scroll-area-viewport"]')?.scrollTo(0, 0); }}><ChevronRight /></Button></PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </section>
          <Tabs className="detail-pane gap-0" value={view.face} onValueChange={(face) => setView((current) => ({ ...current, face: face as Face }))}>
            <div className="detail-toolbar">
              <TabsList aria-label="卡片内容">
                <TabsTrigger value="front" disabled={!card}>正面</TabsTrigger>
                <TabsTrigger value="back" disabled={!card}>背面</TabsTrigger>
                <TabsTrigger value="fields" disabled={!card}>字段</TabsTrigger>
              </TabsList>
              <span className="text-xs text-muted-foreground tabular-nums">{card ? `${index + 1} / ${filtered.length}` : ""}</span>
            </div>
            <Separator />
            <TabsContent key={`${view.selected}-${view.face}`} value={view.face} className="mt-0 min-h-0">
              <ScrollArea className="reader-scroll h-full max-[760px]:h-[420px]">
                <div className="preview-content"><CardPreview card={card} face={view.face} media={session.media} onError={showError} onSearchShortcut={handleSearchShortcut} /></div>
              </ScrollArea>
            </TabsContent>
            <Separator />
            <div className="detail-footer">
              <Button variant="outline" size="icon" aria-label="上一张卡片" disabled={index <= 0} onClick={() => navigateCard(-1)}><ChevronLeft /></Button>
              <Button className="min-w-40" disabled={!card} onClick={() => setView((current) => ({ ...current, face: current.face === "back" ? "front" : "back" }))}>{view.face === "back" ? "返回正面" : "查看答案"}<Kbd className="bg-primary-foreground/15 text-primary-foreground">空格</Kbd></Button>
              <Button variant="outline" size="icon" aria-label="下一张卡片" disabled={index < 0 || index === filtered.length - 1} onClick={() => navigateCard(1)}><ChevronRight /></Button>
            </div>
          </Tabs>
        </Card>
      </section>}
      <footer className="app-footer"><Button variant="link" size="sm" asChild className="px-0 text-xs text-muted-foreground"><a href="/vendor/LICENSES.txt" target="_blank" rel="noopener">开源许可</a></Button><span>{session ? "← → 切换卡片 · 空格查看答案" : "支持新旧版 Anki 卡包"}</span></footer>
    </SidebarInset>
    <Input ref={fileInput} type="file" accept=".apkg,.colpkg,.anki2" className="hidden" onChange={(event) => { importFile(event.target.files?.[0]); event.target.value = ""; }} />
    {dragging && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-background/85 backdrop-blur-sm pointer-events-none transition-all">
        <Empty className="w-full max-w-lg rounded-2xl border-2 border-dashed border-primary bg-card/95 p-10 shadow-2xl">
          <EmptyHeader>
            <EmptyMedia variant="icon" className="size-16 rounded-full border-primary/20 bg-primary/10 text-primary">
              <Upload className="size-8" />
            </EmptyMedia>
            <EmptyTitle className="text-xl font-semibold">松开鼠标，打开卡包</EmptyTitle>
            <EmptyDescription>.apkg / .colpkg / .anki2 · 文件仅在本地浏览器解析</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    )}
  </SidebarProvider>;
}
