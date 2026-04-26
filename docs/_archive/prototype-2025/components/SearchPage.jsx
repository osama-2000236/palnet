/*
  ARCHIVED — DO NOT EDIT.
  Production code is at:
    Components → packages/ui-web/src/   (@baydar/ui-web)
    Pages      → apps/web/src/app/
  Historical reference only.
*/
/* global React, Icon, Avatar, Badge, Surface */
function SearchPage({ onOpenProfile }) {
  const data = window.PALNET_DATA;
  const [q, setQ] = React.useState("مهندس");
  const [filter, setFilter] = React.useState("people");
  const hits = data.people;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px", display: "grid", gridTemplateColumns: "220px 1fr", gap: 24, alignItems: "start" }}>
      <aside>
        <Surface variant="flat" style={{ padding: "12px 0" }}>
          <div className="caption" style={{ padding: "0 16px 8px" }}>تصفية</div>
          <FilterRow icon="users" label="أشخاص" active={filter === "people"} count={hits.length} onClick={() => setFilter("people")}/>
          <FilterRow icon="briefcase" label="وظائف" active={filter === "jobs"} count={2} onClick={() => setFilter("jobs")}/>
          <FilterRow icon="home" label="منشورات" active={filter === "posts"} count={14} onClick={() => setFilter("posts")}/>
          <FilterRow icon="bookmark" label="شركات" active={filter === "companies"} count={3} onClick={() => setFilter("companies")}/>
        </Surface>
      </aside>

      <section className="col gap-3" style={{ minWidth: 0 }}>
        <form onSubmit={(e) => e.preventDefault()} className="row gap-2">
          <div className="row items-center gap-2 grow" style={{ background: "var(--surface)", border: "1px solid var(--line-hard)", borderRadius: 10, padding: "10px 14px" }}>
            <Icon name="search" size={16}/>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث..."
              style={{ border: 0, outline: "none", font: "inherit", background: "transparent", width: "100%" }}/>
          </div>
          <button className="btn primary">بحث</button>
        </form>

        <div className="caption">{hits.length} نتيجة لـ "<span className="text-ink" style={{ fontWeight: 600 }}>{q}</span>" في {filter === "people" ? "الأشخاص" : "الكل"}</div>

        <Surface variant="card" style={{ padding: 0 }}>
          {hits.map((p, i) => (
            <div key={p.id} className="row items-start gap-3" style={{ padding: "16px 20px", borderTop: i ? "1px solid var(--line-soft)" : "none" }}>
              <button onClick={() => onOpenProfile?.(p.id)} style={{ background: "transparent", border: 0, padding: 0, cursor: "pointer" }}>
                <Avatar user={p} size="lg"/>
              </button>
              <div className="col grow" style={{ minWidth: 0 }}>
                <button onClick={() => onOpenProfile?.(p.id)} className="h3" style={{ background: "transparent", border: 0, padding: 0, textAlign: "start", cursor: "pointer" }}>
                  {p.firstName} {p.lastName}
                </button>
                <div className="small">{p.headline}</div>
                <div className="caption">{p.location} · اتصال من الدرجة الثانية</div>
              </div>
              <button className="btn secondary sm"><Icon name="plus" size={14}/> تواصل</button>
            </div>
          ))}
        </Surface>
      </section>
    </div>
  );
}

function FilterRow({ icon, label, count, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: "100%", padding: "10px 16px", border: 0, background: active ? "var(--brand-50)" : "transparent",
      borderInlineStart: `3px solid ${active ? "var(--brand-600)" : "transparent"}`,
      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between",
      color: "var(--ink)", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: active ? 600 : 500,
    }}>
      <span className="row items-center gap-2"><Icon name={icon} size={16}/>{label}</span>
      <span className="mono caption">{count}</span>
    </button>
  );
}

window.SearchPage = SearchPage;