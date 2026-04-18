/* global React, Icon, Avatar, Badge */
function AppShell({ current, onNavigate, children }) {
  const data = window.PALNET_DATA;
  const me = data.me;
  const navItems = [
    { key: "feed", icon: "home", label: "الرئيسية" },
    { key: "network", icon: "users", label: "شبكتي" },
    { key: "jobs", icon: "briefcase", label: "الوظائف" },
    { key: "messages", icon: "message", label: "الرسائل", badge: 3 },
    { key: "notifications", icon: "bell", label: "الإشعارات", badge: 2 },
  ];

  const [q, setQ] = React.useState("");

  return (
    <div style={{ minHeight: "100vh", background: "var(--surface-muted)" }}>
      <header style={{
        position: "sticky", top: 0, zIndex: 20,
        background: "var(--surface)",
        borderBottom: "1px solid var(--line-soft)",
        height: "var(--nav-h)",
      }}>
        <div style={{
          maxWidth: "var(--max-w)", margin: "0 auto", height: "100%",
          padding: "0 20px",
          display: "flex", alignItems: "center", gap: 16,
        }}>
          {/* Logo + search */}
          <button
            type="button"
            onClick={() => onNavigate("feed")}
            style={{ display: "flex", alignItems: "center", gap: 10, background: "transparent", border: 0, cursor: "pointer", padding: 0 }}
          >
            <Icon name="logo" size={32}/>
            <span className="h2" style={{ fontSize: 18 }}>بال‌نِت</span>
          </button>

          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "var(--surface-subtle)",
            borderRadius: 9999,
            padding: "8px 14px",
            width: 320, maxWidth: "38%",
          }}>
            <Icon name="search" size={16}/>
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); if (e.target.value) onNavigate("search"); }}
              placeholder="ابحث عن أشخاص، وظائف، شركات..."
              style={{ background: "transparent", border: 0, outline: "none", font: "inherit", color: "var(--ink)", width: "100%" }}
            />
          </div>

          <div style={{ flex: 1 }}/>

          {/* Nav icons */}
          <nav className="row" style={{ gap: 2 }}>
            {navItems.map(n => (
              <button
                key={n.key}
                type="button"
                onClick={() => onNavigate(n.key)}
                style={{
                  position: "relative",
                  display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 2,
                  padding: "8px 12px", border: 0, background: "transparent", cursor: "pointer",
                  color: current === n.key ? "var(--ink)" : "var(--ink-muted)",
                  borderBottom: `2px solid ${current === n.key ? "var(--brand-600)" : "transparent"}`,
                  fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 500,
                  marginBottom: -1,
                }}
              >
                <span style={{ position: "relative" }}>
                  <Icon name={n.icon} size={20}/>
                  {n.badge ? (
                    <span style={{
                      position: "absolute", top: -4, insetInlineEnd: -6,
                      background: "var(--accent-600)", color: "#fff",
                      fontSize: 10, fontWeight: 700,
                      minWidth: 16, height: 16, padding: "0 4px",
                      borderRadius: 9999, display: "inline-flex", alignItems: "center", justifyContent: "center",
                    }}>{n.badge}</span>
                  ) : null}
                </span>
                <span>{n.label}</span>
              </button>
            ))}

            <div style={{ width: 1, background: "var(--line-soft)", margin: "8px 8px" }}/>

            <button
              type="button"
              onClick={() => onNavigate("profile")}
              style={{
                display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 2,
                padding: "6px 10px", border: 0, background: "transparent", cursor: "pointer",
                color: current === "profile" ? "var(--ink)" : "var(--ink-muted)",
                borderBottom: `2px solid ${current === "profile" ? "var(--brand-600)" : "transparent"}`,
                fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 500,
                marginBottom: -1,
              }}
            >
              <Avatar user={me} size="sm"/>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                ملفي <Icon name="chevron-down" size={12}/>
              </span>
            </button>
          </nav>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}

window.AppShell = AppShell;
