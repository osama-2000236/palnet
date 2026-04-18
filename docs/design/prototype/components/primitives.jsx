/* global React */
// Shared presentation primitives for the PalNet prototype.
// Export to window so other babel scripts can consume them.

function Icon({ name, size = 18, strokeWidth = 1.8 }) {
  const props = {
    width: size, height: size, viewBox: "0 0 24 24",
    fill: "none", stroke: "currentColor", strokeWidth, strokeLinecap: "round", strokeLinejoin: "round",
    className: "icon", "aria-hidden": "true",
  };
  switch (name) {
    case "home": return (<svg {...props}><path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/></svg>);
    case "users": return (<svg {...props}><circle cx="9" cy="9" r="3.5"/><path d="M2.5 20c0-3 3-5 6.5-5s6.5 2 6.5 5"/><circle cx="17" cy="10" r="2.5"/><path d="M21.5 19c0-2-1.5-3.5-4-4"/></svg>);
    case "briefcase": return (<svg {...props}><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/></svg>);
    case "message": return (<svg {...props}><path d="M4 5h16v12H8l-4 4z"/></svg>);
    case "bell": return (<svg {...props}><path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6z"/><path d="M10 19a2 2 0 0 0 4 0"/></svg>);
    case "search": return (<svg {...props}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>);
    case "plus": return (<svg {...props}><path d="M12 5v14M5 12h14"/></svg>);
    case "image": return (<svg {...props}><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m3 18 6-5 5 4 3-2 4 3"/></svg>);
    case "video": return (<svg {...props}><rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3z"/></svg>);
    case "calendar": return (<svg {...props}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>);
    case "thumb": return (<svg {...props}><path d="M7 11v9H4v-9zM7 11l4-7c1.5 0 2.5 1 2.5 2.5V10h5a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 17.3 20H7"/></svg>);
    case "comment": return (<svg {...props}><path d="M4 5h16v12H8l-4 4z"/></svg>);
    case "repost": return (<svg {...props}><path d="M4 8h12l-3-3M20 16H8l3 3"/></svg>);
    case "send": return (<svg {...props}><path d="m21 3-9 18-2-8-8-2z"/></svg>);
    case "send-paper": return (<svg {...props}><path d="M21 12 3 4l3 8-3 8z"/><path d="M6 12h15"/></svg>);
    case "check": return (<svg {...props}><path d="m5 12 5 5L20 7"/></svg>);
    case "x": return (<svg {...props}><path d="M6 6l12 12M18 6 6 18"/></svg>);
    case "more": return (<svg {...props}><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></svg>);
    case "chevron-down": return (<svg {...props}><path d="m6 9 6 6 6-6"/></svg>);
    case "bookmark": return (<svg {...props}><path d="M6 4h12v17l-6-4-6 4z"/></svg>);
    case "logo": return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="5" fill="var(--brand-600)"/>
        <path d="M7 17V7M7 12c3 0 5-1.5 5-4s-2-3-4-3M12 17l5-10M14 17h3" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
      </svg>
    );
    default: return null;
  }
}

function Avatar({ user, size = "md", online = false, ring = false }) {
  if (!user) return null;
  const cls = `avatar ${size} ${user.avatar?.palette || "palette-1"}`;
  return (
    <span className="relative shrink-0" style={ring ? { padding: 2, borderRadius: 9999, background: "var(--surface)", boxShadow: "0 0 0 2px var(--brand-600)" } : null}>
      <span className={cls}>{user.avatar?.initials}</span>
      {online ? (
        <span style={{
          position: "absolute", insetInlineEnd: 0, bottom: 0,
          width: size === "sm" ? 9 : 11, height: size === "sm" ? 9 : 11,
          borderRadius: 9999, background: "var(--success)",
          border: "2px solid var(--surface)",
        }}/>
      ) : null}
    </span>
  );
}

function Badge({ children, kind = "neutral" }) {
  return <span className={`badge ${kind}`}>{children}</span>;
}

function Surface({ as = "div", variant = "card", className = "", children, ...rest }) {
  const Tag = as;
  const v = `surface-${variant}`;
  return <Tag className={`${v} ${className}`} {...rest}>{children}</Tag>;
}

function IconButton({ icon, label, onClick, active = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="icon-btn"
      style={{
        display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 2,
        padding: "8px 10px", border: 0, background: "transparent", cursor: "pointer",
        color: active ? "var(--ink)" : "var(--ink-muted)",
        borderBottom: `2px solid ${active ? "var(--brand-600)" : "transparent"}`,
        fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 500,
        minWidth: 72,
      }}
    >
      <Icon name={icon} size={20}/>
      <span>{label}</span>
    </button>
  );
}

function MediaPlaceholder({ label, height = 280 }) {
  return <div className="img-ph" style={{ height, width: "100%" }}>{`[ ${label} ]`}</div>;
}

Object.assign(window, { Icon, Avatar, Badge, Surface, IconButton, MediaPlaceholder });
