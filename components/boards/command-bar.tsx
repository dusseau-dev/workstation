"use client";

export function CommandBar() {
  return (
    <div
      className="fixed left-1/2 z-50 -translate-x-1/2"
      style={{ bottom: 32 }}
    >
      <div
        className="flex items-center"
        style={{
          width: 420,
          gap: 8,
          padding: 8,
          background: "#FFFFFF",
          borderRadius: 12,
          boxShadow: "0 8px 16px rgba(0,0,0,0.04), 0 0 0 1px #DEDEDE",
        }}
      >
        <div style={{ padding: "0 4px", color: "#8F8F8F", flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Update status or ask AI..."
          className="min-w-0 flex-1 border-none outline-none"
          style={{
            padding: "8px 12px",
            fontSize: 14,
            color: "#1A1A1A",
            background: "transparent",
            fontFamily: "inherit",
          }}
        />
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "#8F8F8F",
            background: "#EBEBEB",
            padding: "4px 8px",
            borderRadius: 4,
            flexShrink: 0,
          }}
        >
          ⌘ K
        </span>
      </div>
    </div>
  );
}
