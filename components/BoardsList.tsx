"use client";

import { useEffect, useState } from "react";
import type { PinterestBoard } from "@/types";

// Muestra los boards del usuario conectado a Pinterest
export default function BoardsList() {
  const [boards, setBoards] = useState<PinterestBoard[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/pinterest/boards")
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "Error");
        if (active) setBoards(j.boards ?? []);
      })
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return (
      <p className="rounded-xl bg-rosa-50 p-4 text-sm text-noche/70">
        No pudimos cargar tus boards: {error}
      </p>
    );
  }
  if (!boards) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square animate-pulse-rosa rounded-2xl bg-rosa-100"
          />
        ))}
      </div>
    );
  }
  if (boards.length === 0) {
    return (
      <p className="rounded-xl bg-rosa-50 p-4 text-sm text-noche/70">
        Todavía no tienes boards públicos en tu cuenta de Pinterest.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {boards.map((b) => (
        <li
          key={b.id}
          className="overflow-hidden rounded-2xl border border-rosa-100 bg-white shadow-sm"
        >
          <div className="relative aspect-square bg-rosa-50">
            {b.image_cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={b.image_cover_url}
                alt={b.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-display text-2xl text-rosa-400">
                {b.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="p-3">
            <p className="line-clamp-1 text-sm font-medium text-noche">
              {b.name}
            </p>
            <p className="text-xs text-noche/50">{b.pin_count ?? 0} pins</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
