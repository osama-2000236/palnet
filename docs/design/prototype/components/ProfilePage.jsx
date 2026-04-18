/* global React, Icon, Avatar, Badge, Surface, MediaPlaceholder */
function ProfilePage({ userId, onNavigate }) {
  const data = window.PALNET_DATA;
  const user = userId && data.byId[userId] ? data.byId[userId] : data.me;
  const isSelf = user.id === data.me.id;
  const [tab, setTab] = React.useState("about");

  const experiences = [
    { title: "مهندسة منتجات أولى", company: "منصة كرمة", from: "2024", to: "الآن", desc: "أقود تصميم وتنفيذ تجارب RTL لفرق صغيرة عبر الوطن العربي." },
    { title: "مصممة تفاعل", company: "استوديو زيتونة", from: "2021", to: "2024", desc: "صممت عشرات الواجهات العربية لتطبيقات ومنصات محلية." },
  ];

  const education = [
    { school: "جامعة بيرزيت", degree: "بكالوريوس", field: "علوم الحاسوب", years: "2017 — 2021" },
  ];

  const skills = ["تصميم RTL", "أبحاث المستخدم", "Figma", "تصميم الأنظمة", "React", "تجربة المستخدم", "الطباعة العربية"];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px", display: "grid", gridTemplateColumns: "1fr 280px", gap: 24, alignItems: "start" }}>
      <div className="col gap-3" style={{ minWidth: 0 }}>
        {/* Hero header */}
        <Surface variant="hero">
          <div style={{ height: 140, background:
            "linear-gradient(135deg, var(--brand-600) 0%, var(--brand-800) 60%, var(--accent-600) 140%)",
            position: "relative",
          }}>
            <div className="img-ph" style={{ height: "100%", width: "100%", opacity: 0.15 }}/>
          </div>
          <div style={{ padding: "0 24px 20px", marginTop: -48 }}>
            <div className="row items-end justify-between gap-4 wrap">
              <Avatar user={user} size="xl" ring/>
              <div className="row gap-2 wrap">
                {isSelf ? (
                  <>
                    <button className="btn secondary sm"><Icon name="plus" size={14}/> إضافة قسم</button>
                    <button className="btn secondary sm">تحرير الملف</button>
                  </>
                ) : (
                  <>
                    <button className="btn primary"><Icon name="plus" size={14}/> تواصل</button>
                    <button className="btn secondary"><Icon name="message" size={14}/> رسالة</button>
                    <button className="btn ghost"><Icon name="more" size={18}/></button>
                  </>
                )}
              </div>
            </div>
            <div className="display" style={{ fontSize: 28, marginTop: 12 }}>{user.firstName} {user.lastName}</div>
            <div className="body" style={{ marginTop: 4 }}>{user.headline}</div>
            <div className="small row gap-2 items-center" style={{ marginTop: 6 }}>
              <span>{user.location}</span><span>·</span>
              <span>/in/{user.handle}</span><span>·</span>
              <a className="text-brand" style={{ fontWeight: 600 }}>{data.me.connections} اتصال</a>
            </div>
            <div className="row gap-2 wrap" style={{ marginTop: 12 }}>
              <Badge kind="brand">تقبل الفرص</Badge>
              <Badge kind="accent">تعمل عن بُعد</Badge>
            </div>
          </div>
        </Surface>

        {/* Tabs */}
        <Surface variant="flat" style={{ padding: "0 20px" }}>
          <div className="tabs">
            <button className={`tab ${tab === "about" ? "active" : ""}`} onClick={() => setTab("about")}>نبذة</button>
            <button className={`tab ${tab === "exp" ? "active" : ""}`} onClick={() => setTab("exp")}>الخبرات</button>
            <button className={`tab ${tab === "edu" ? "active" : ""}`} onClick={() => setTab("edu")}>التعليم</button>
            <button className={`tab ${tab === "skills" ? "active" : ""}`} onClick={() => setTab("skills")}>المهارات</button>
            <button className={`tab ${tab === "activity" ? "active" : ""}`} onClick={() => setTab("activity")}>النشاط</button>
          </div>
        </Surface>

        {/* Content */}
        {tab === "about" && (
          <Surface variant="card" style={{ padding: 20 }}>
            <div className="h2" style={{ marginBottom: 8 }}>نبذة</div>
            <p className="body" style={{ color: "var(--ink)" }}>
              مهندسة منتجات بخبرة سبع سنوات في تصميم واجهات عربية. أهتم بجعل البرمجيات العربية تبدو كأنها صُمّمت بالعربية، لا مُترجَمة إليها. أعمل حالياً على منصة كرمة لإدارة المشاريع.
            </p>
          </Surface>
        )}

        {tab === "exp" && (
          <Surface variant="card" style={{ padding: 0 }}>
            <div className="row items-center justify-between" style={{ padding: "16px 20px 8px" }}>
              <div className="h2">الخبرات</div>
              {isSelf ? <button className="btn ghost sm"><Icon name="plus" size={14}/> إضافة</button> : null}
            </div>
            <div>
              {experiences.map((e, i) => (
                <div key={i} className="row items-start gap-4" style={{ padding: "16px 20px", borderTop: "1px solid var(--line-soft)" }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 8, background: "var(--surface-sunken)",
                    display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-muted)",
                    fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 18,
                  }}>{e.company[0]}</div>
                  <div className="col grow">
                    <div className="h3">{e.title}</div>
                    <div className="small">{e.company}</div>
                    <div className="caption">{e.from} — {e.to}</div>
                    <div className="body" style={{ marginTop: 6, fontSize: 14 }}>{e.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </Surface>
        )}

        {tab === "edu" && (
          <Surface variant="card" style={{ padding: 20 }}>
            <div className="h2" style={{ marginBottom: 12 }}>التعليم</div>
            {education.map((ed, i) => (
              <div key={i} className="col gap-1">
                <div className="h3">{ed.school}</div>
                <div className="small">{ed.degree} · {ed.field}</div>
                <div className="caption">{ed.years}</div>
              </div>
            ))}
          </Surface>
        )}

        {tab === "skills" && (
          <Surface variant="card" style={{ padding: 20 }}>
            <div className="h2" style={{ marginBottom: 12 }}>المهارات</div>
            <div className="row wrap gap-2">
              {skills.map(s => <span key={s} className="chip">{s}</span>)}
            </div>
          </Surface>
        )}

        {tab === "activity" && (
          <Surface variant="card" style={{ padding: 20 }}>
            <div className="h2" style={{ marginBottom: 8 }}>النشاط الأخير</div>
            <p className="small">أعجبَت بمنشور <span className="text-ink" style={{ fontWeight: 600 }}>ريم دباغ</span> · منذ 5 ساعات</p>
          </Surface>
        )}
      </div>

      {/* Right rail */}
      <aside className="col gap-3" style={{ position: "sticky", top: "calc(var(--nav-h) + 20px)" }}>
        <Surface variant="flat" style={{ padding: 16 }}>
          <div className="h3" style={{ marginBottom: 8 }}>إحصائيات الملف</div>
          <div className="col gap-2">
            <div className="row justify-between"><span className="small">مشاهدات هذا الأسبوع</span><span className="mono text-ink" style={{ fontWeight: 600 }}>247</span></div>
            <div className="row justify-between"><span className="small">ظهور في البحث</span><span className="mono text-ink" style={{ fontWeight: 600 }}>38</span></div>
          </div>
        </Surface>
        <Surface variant="flat" style={{ padding: 16 }}>
          <div className="h3" style={{ marginBottom: 8 }}>اقتراحات لك</div>
          <p className="small">أكمل قسم الإنجازات لزيادة ظهورك في نتائج البحث.</p>
          <button className="btn secondary sm" style={{ marginTop: 10 }}>إكمال</button>
        </Surface>
      </aside>
    </div>
  );
}

window.ProfilePage = ProfilePage;
