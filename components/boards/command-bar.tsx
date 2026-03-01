"use client";

import { Mic } from "lucide-react";

export function CommandBar() {
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-2 bg-popover border border-border rounded-xl shadow-[0_8px_16px_rgba(0,0,0,0.04),0_0_0_1px_var(--border)] px-2 py-1.5 w-[420px]">
        <button
          type="button"
          className="shrink-0 p-2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Voice input"
        >
          <Mic className="h-4 w-4" />
        </button>
        <input
          type="text"
          placeholder="Update status or ask AI..."
          className="flex-1 bg-transparent border-none outline-none text-sm py-1.5 px-1 placeholder:text-muted-foreground/60"
        />
        <kbd className="shrink-0 text-[10px] font-semibold bg-muted text-muted-foreground px-2 py-1 rounded">
          ⌘ K
        </kbd>
      </div>
    </div>
  );
}
