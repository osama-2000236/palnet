/*
  ARCHIVED — DO NOT EDIT.
  Production code is at:
    Components → packages/ui-web/src/   (@baydar/ui-web)
    Pages      → apps/web/src/app/
  Historical reference only.
*/
/* global React, Icon, Avatar, Badge, Surface */
function MessagesPage() {
  const data = window.PALNET_DATA;
  const [activeId, setActiveId] = React.useState("r1");
  const [draft, setDraft] = React.useState("");
  const [threads, setThreads] = React.useState(data.threads);
  const endRef = React.useRef(null);

  const rooms = data.rooms;
  const active = rooms.find(r => r.id === activeId);
  const other = active ? data.byId[active.userId] : null;
  const messages = threads[activeId] || [];

  React.useEffect(() => { endRef.current?.scrollTo({ top: 99999 }); }, [activeId, messages.length]);

  function send(e) {
    e.preventDefault();
    if (!draft.trim()) return;
    const m = { authorId: "u-me", body: draft.trim(), at: "الآن" };
    setThreads(t => ({ ...t, [activeId]: [...(t[activeId] || []), m] }));
    setDraft("");
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px" }}>
      <Surface variant="card" style={{ padding: 0, overflow: "hidden", height: "calc(100vh - var(--nav-h) - 40px)", minHeight: 560 }}>
        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", height: "100%" }}>
          {/* Rooms list */}
          <aside style={{ borderInlineEnd: "1px solid var(--line-soft)", display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div className="row items-center justify-between" style={{ padding: "14px 16px", borderBottom: "1px solid var(--line-soft)" }}>
              <div className="h2">الرسائل</div>
              <button className="btn ghost sm" aria-label="رسالة جديدة"><Icon name="plus" size={18}/></button>
            </div>
            <div style={{ padding: "8px 12px" }}>
              <div className="row items-center gap-2" style={{ background: "var(--surface-subtle)", borderRadius: 9999, padding: "6px 12px" }}>
                <Icon name="search" size={14}/>
                <input placeholder="ابحث في الرسائل" style={{ border: 0, outline: "none", background: "transparent", font: "inherit", width: "100%" }}/>
              </div>
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {rooms.map(r => {
                const u = data.byId[r.userId];
                const isActive = r.id === activeId;
                return (
                  <button
                    key={r.id}
                    onClick={() => setActiveId(r.id)}
                    style={{
                      width: "100%", textAlign: "start", padding: "12px 16px",
                      background: isActive ? "var(--brand-50)" : "transparent",
                      borderInlineStart: `3px solid ${isActive ? "var(--brand-600)" : "transparent"}`,
                      border: 0, borderBottom: "1px solid var(--line-soft)",
                      cursor: "pointer", display: "flex", gap: 12, alignItems: "center",
                    }}
                  >
                    <Avatar user={u} size="md" online={r.online}/>
                    <div className="col grow" style={{ minWidth: 0 }}>
                      <div className="row items-center justify-between">
                        <span className="h3" style={{ fontSize: 14 }}>{u.firstName} {u.lastName}</span>
                        <span className="caption">{r.lastAt}</span>
                      </div>
                      <div className="row items-center justify-between gap-2">
                        <span className="small truncate" style={{ color: r.unread ? "var(--ink)" : "var(--ink-muted)", fontWeight: r.unread ? 600 : 400 }}>{r.lastBody}</span>
                        {r.unread ? <Badge kind="unread">{r.unread}</Badge> : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Thread */}
          <section style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div className="row items-center justify-between" style={{ padding: "12px 20px", borderBottom: "1px solid var(--line-soft)" }}>
              <div className="row items-center gap-3">
                <Avatar user={other} size="md" online={active?.online}/>
                <div className="col">
                  <div className="h3">{other.firstName} {other.lastName}</div>
                  <div className="caption">{active?.online ? "متصل الآن" : "آخر ظهور قبل ساعة"}</div>
                </div>
              </div>
              <div className="row gap-1">
                <button className="btn ghost sm"><Icon name="video" size={18}/></button>
                <button className="btn ghost sm"><Icon name="more" size={18}/></button>
              </div>
            </div>

            <div ref={endRef} style={{ flex: 1, overflowY: "auto", padding: "20px", background: "var(--surface-muted)", display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="caption" style={{ alignSelf: "center", background: "var(--surface)", padding: "4px 12px", borderRadius: 9999, border: "1px solid var(--line-soft)" }}>اليوم</div>
              {messages.map((m, i) => {
                const mine = m.authorId === "u-me";
                return (
                  <div key={i} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "70%" }}>
                    <div style={{
                      background: mine ? "var(--brand-100)" : "var(--surface)",
                      color: "var(--ink)",
                      border: "1px solid " + (mine ? "var(--brand-200)" : "var(--line-soft)"),
                      padding: "10px 14px",
                      borderRadius: 14,
                      borderEndEndRadius: mine ? 4 : 14,
                      borderEndStartRadius: mine ? 14 : 4,
                      fontSize: 14, lineHeight: 1.6,
                    }}>{m.body}</div>
                    <div className="caption" style={{ textAlign: mine ? "end" : "start", marginTop: 3 }}>{m.at}</div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={send} style={{ padding: 12, borderTop: "1px solid var(--line-soft)", display: "flex", alignItems: "end", gap: 8, background: "var(--surface)" }}>
              <button type="button" className="btn ghost sm"><Icon name="image" size={18}/></button>
              <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="اكتب رسالة..." rows={1}
                className="textarea" style={{ minHeight: 40, resize: "none", borderRadius: 20, padding: "10px 16px" }}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(e); } }}
              />
              <button type="submit" className="btn primary" disabled={!draft.trim()}>
                <Icon name="send-paper" size={14}/> إرسال
              </button>
            </form>
          </section>
        </div>
      </Surface>
    </div>
  );
}

window.MessagesPage = MessagesPage;