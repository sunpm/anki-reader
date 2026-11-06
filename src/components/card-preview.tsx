"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Empty, EmptyTitle } from "@/components/ui/empty";
import type { Face, ReaderCard } from "@/lib/anki";
import { createCardRenderer } from "@/lib/card-renderer";

interface CardPreviewProps {
  card: ReaderCard | undefined;
  face: Face;
  media: Map<string, string>;
  onError: (message: string) => void;
  onSearchShortcut: (event: KeyboardEvent) => void;
}

export function CardPreview({ card, face, media, onError, onSearchShortcut }: CardPreviewProps) {
  const render = useMemo(() => createCardRenderer(media), [media]);
  const content = useMemo(() => render(card, face), [render, card, face]);

  if (!card) return <Empty className="min-h-60"><EmptyTitle className="text-sm text-muted-foreground">没有可预览的卡片</EmptyTitle></Empty>;

  return <>
    {content.caption && <div className="card-caption">{content.caption}</div>}
    <iframe
      className="card-frame"
      title="卡片内容"
      sandbox="allow-same-origin"
      referrerPolicy="no-referrer"
      srcDoc={content.document}
      onLoad={(event) => {
        const frame = event.currentTarget;
        const cardDocument = frame.contentDocument!;
        cardDocument.addEventListener("keydown", onSearchShortcut);
        const resize = () => { frame.style.height = `${Math.max(240, cardDocument.body.scrollHeight + 30)}px`; };
        cardDocument.addEventListener("click", (event) => {
          const button = (event.target as Element).closest("[data-reader-audio]");
          if (!button) return;
          event.preventDefault();
          const audio = button.querySelector("audio")!;
          audio.currentTime = 0;
          audio.play().catch(() => onError("这个音频无法播放，请确认卡包中的音频文件完整且浏览器支持其格式。"));
        });
        cardDocument.addEventListener("keydown", (event) => {
          const target = event.target as HTMLElement;
          if (event.key === " " && target.matches("a[data-reader-audio]")) {
            event.preventDefault();
            target.click();
          }
        });
        cardDocument.querySelectorAll("audio").forEach((audio) => audio.addEventListener("play", () => {
          cardDocument.querySelectorAll("audio").forEach((other) => { if (other !== audio) other.pause(); });
        }));
        resize();
        cardDocument.querySelectorAll("img").forEach((img) => img.addEventListener("load", resize, { once: true }));
      }}
    />
    {content.note && <Alert className="mt-4"><AlertDescription>{content.note}</AlertDescription></Alert>}
    <div className="card-tags">
      {card?.note.tags.map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
    </div>
  </>;
}
