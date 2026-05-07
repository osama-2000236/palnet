/*
  ARCHIVED — DO NOT EDIT.
  Production code is at:
    Components → packages/ui-web/src/   (@baydar/ui-web)
    Pages      → apps/web/src/app/
  Historical reference only.
*/
/* global React, Icon, Avatar, Badge, Surface */
function NetworkPage({ onOpenProfile }) {
  const data = window.PALNET_DATA;
  const [tab, setTab] = React.useState("invites");

  const invites = data.people.slice(0, 3);
  const suggestions = data.people.slice(3);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px", display: "grid", gridTemplateColumns: "220px 1fr", gap: 24, alignItems: "start" }}>
      <aside>
        <Surface variant="flat" style={{ padding: 0 }}>
          <div className="h3" style={{ padding: "14px 16px 10px" }}>إدارة شبكتي</div>
          <SideRow icon="users" label="الاتصالات" count={data.me.connections}/>
          <SideRow icon="message" label="المتابعون" count={289}/>
          <SideRow icon="calendar" label="الفعاليات" count={6}/>
          <SideRow icon="bookmark" label="الصفحات" count={12}/>
        </Surface>
      </aside>

      <section className="col gap-3" style={{ minWidth: 0 }}>
        <Surface variant="flat" style={{ padding: "0 20px" }}>
          <div className="tabs">
            <button className={`tab ${tab === "invites" ? "active" : ""}`} onClick={() => setTab("invites")}>الدعوات ({invites.length})</button>
            <button className={`tab ${tab === "suggest" ? "active" : ""}`} onClick={() => setTab("suggest")}>قد تعرفهم</button>
            <button className={`tab ${tab === "mine" ? "active" : ""}`} onClick={() => setTab("mine")}>اتصالاتي</button>
          </div>
        </Surface>

        {tab === "invites" && (
          <Surface variant="card" style={{ padding: 0 }}>
            <div className="h3" style={{ padding: "14px 20px 10px" }}>دعوات الاتصال</div>
            <div>
              {invites.map(p => (
                <div key={p.id} className="row items-center gap-3" style={{ padding: "14px 20px", borderTop: "1px solid var(--line-soft)" }}>
                  <button onClick={() => onOpenProfile?.(p.id)} style={{ background: "transparent", border: 0, padding: 0, cursor: "pointer" }}>
                    <Avatar user={p} size="md"/>
                  </button>
                  <div className="col grow" style={{ minWidth: 0 }}>
                    <div className="h3" style={{ fontSize: 14 }}>{p.firstName} {p.lastName}</div>
                    <div className="small truncate">{p.headline}</div>
                    <div className="caption">3 اتصالات مشتركة</div>
                  </div>
                  <div className="row gap-2">
                    <button className="btn ghost sm">تجاهل</button>
                    <button className="btn primary sm"><Icon name="check" size={14}/> قبول</button>
                  </div>
                </div>
              ))}
            </div>
          </Surface>
        )}

        {tab === "suggest" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
            {suggestions.map(p => (
              <Surface key={p.id} variant="card" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ height: 60, background: "linear-gradient(135deg, var(--brand-300), var(--brand-500))" }}/>
                <div style={{ padding: "0 16px 16px", marginTop: -28, textAlign: "center" }}>
                  <Avatar user={p} size="lg" ring/>
                  <div className="h3" style={{ marginTop: 8, fontSize: 14 }}>{p.firstName} {p.lastName}</div>
                  <div className="small" style={{ marginTop: 2, minHeight: 32, lineHeight: 1.4 }}>{p.headline}</div>
                  <div className="caption" style={{ marginTop: 6 }}>{p.location}</div>
                  <button className="btn secondary sm" style={{ marginTop: 12, width: "100%" }}>
                    <Icon name="plus" size={14}/> تواصل
                  </button>
                </div>
              </Surface>
            ))}
          </div>
        )}

        {tab === "mine" && (
          <Surface variant="card" style={{ padding: 0 }}>
            <div className="row items-center justify-between" style={{ padding: "14px 20px" }}>
              <div className="h3">اتصالاتي ({data.me.connections})</div>
              <button className="btn ghost sm">ترتيب <Icon name="chevron-down" size={12}/></button>
            </div>
            {data.people.map(p => (
              <div key={p.id} className="row items-center gap-3" style={{ padding: "12px 20px", borderTop: "1px solid var(--line-soft)" }}>
                <Avatar user={p} size="md"/>
                <div className="col grow" style={{ minWidth: 0 }}>
                  <div className="h3" style={{ fontSize: 14 }}>{p.firstName} {p.lastName}</div>
                  <div className="small truncate">{p.headline}</div>
                </div>
                <button className="btn secondary sm"><Icon name="message" size={14}/> رسالة</button>
              </div>
            ))}
          </Surface>
        )}
      </section>
    </div>
  );
}

function SideRow({ icon, label, count }) {
  return (
    <div className="row items-center justify-between" style={{ padding: "10px 16px", borderTop: "1px solid var(--line-soft)", cursor: "pointer" }}>
      <div className="row items-center gap-2"><Icon name={icon} size={16}/><span className="body" style={{ fontSize: 14 }}>{label}</span></div>
      <span className="mono small text-ink" style={{ fontWeight: 600 }}>{count}</span>
    </div>
  );
}

window.NetworkPage = NetworkPage;