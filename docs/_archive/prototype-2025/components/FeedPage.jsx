/*
  ARCHIVED — DO NOT EDIT.
  Production code is at:
    Components → packages/ui-web/src/   (@baydar/ui-web)
    Pages      → apps/web/src/app/
  Historical reference only.
*/
/* global React, Icon, Avatar, Badge, Surface, MediaPlaceholder */

// ── Composer ──────────────────────────────────────────────────────────────
function Composer() {
  const me = window.PALNET_DATA.me;
  const [open, setOpen] = React.useState(false);
  const [body, setBody] = React.useState("");

  if (!open) {
    return (
      <Surface variant="card" className="row items-center gap-3" style={{ padding: 12 }}>
        <Avatar user={me} size="md"/>
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            flex: 1, textAlign: "start", cursor: "pointer",
            background: "var(--surface-subtle)", border: "1px solid var(--line-soft)",
            padding: "10px 16px", borderRadius: 9999, color: "var(--ink-muted)",
            font: "inherit",
          }}
        >
          ابدأ منشوراً...
        </button>
        <div className="row gap-1">
          <button className="btn ghost sm"><Icon name="image" size={16}/> صورة</button>
          <button className="btn ghost sm"><Icon name="video" size={16}/> فيديو</button>
          <button className="btn ghost sm"><Icon name="calendar" size={16}/> مناسبة</button>
        </div>
      </Surface>
    );
  }

  return (
    <Surface variant="card" style={{ padding: 16 }}>
      <div className="row gap-3 items-center" style={{ marginBottom: 12 }}>
        <Avatar user={me} size="md"/>
        <div className="col">
          <span className="h3">{me.firstName} {me.lastName}</span>
          <span className="caption">ينشر للعموم</span>
        </div>
      </div>
      <textarea
        autoFocus
        className="textarea"
        rows={5}
        placeholder="ما الذي تفكر فيه؟"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        style={{ border: 0, padding: 0, fontSize: 16 }}
      />
      <div className="row items-center gap-2" style={{ marginTop: 12 }}>
        <button className="btn ghost sm"><Icon name="image" size={16}/></button>
        <button className="btn ghost sm"><Icon name="video" size={16}/></button>
        <button className="btn ghost sm"><Icon name="calendar" size={16}/></button>
        <div style={{ flex: 1 }}/>
        <span className="caption mono">{body.length} / 3000</span>
        <button className="btn secondary sm" onClick={() => setOpen(false)}>إلغاء</button>
        <button className="btn primary" disabled={body.trim().length === 0}>
          <Icon name="send-paper" size={14}/> نشر
        </button>
      </div>
    </Surface>
  );
}

// ── PostCard ──────────────────────────────────────────────────────────────
function PostCard({ post, onOpenProfile }) {
  const author = window.PALNET_DATA.byId[post.authorId];
  const [liked, setLiked] = React.useState(post.liked);
  const [reactions, setReactions] = React.useState(post.reactions);
  const [showComments, setShowComments] = React.useState(false);
  const comments = window.PALNET_DATA.comments[post.id] || [];

  function toggleLike() {
    setLiked(v => !v);
    setReactions(n => n + (liked ? -1 : 1));
  }

  return (
    <Surface variant="card" style={{ padding: 0, overflow: "hidden" }}>
      {/* Header */}
      <div className="row items-start gap-3" style={{ padding: "14px 16px 10px" }}>
        <button onClick={() => onOpenProfile?.(author.id)} style={{ background: "transparent", border: 0, padding: 0, cursor: "pointer" }}>
          <Avatar user={author} size="md"/>
        </button>
        <div className="col grow" style={{ gap: 2 }}>
          <button
            onClick={() => onOpenProfile?.(author.id)}
            style={{ background: "transparent", border: 0, padding: 0, textAlign: "start", cursor: "pointer" }}
            className="h3"
          >
            {author.firstName} {author.lastName}
          </button>
          <span className="small">{author.headline}</span>
          <span className="caption">{post.createdAt} · <span style={{ color: "var(--ink-subtle)" }}>منشور عام</span></span>
        </div>
        <button className="btn ghost sm" aria-label="خيارات"><Icon name="more" size={18}/></button>
      </div>

      {/* Body */}
      <div style={{ padding: "0 16px 12px", whiteSpace: "pre-wrap", fontSize: 15, lineHeight: 1.7 }}>
        {post.body}
      </div>

      {/* Media */}
      {post.media.length > 0 ? (
        <div>
          {post.media.map((m, i) => (
            <MediaPlaceholder key={i} label={m.label} height={340}/>
          ))}
        </div>
      ) : null}

      {/* Stats row */}
      <div className="row items-center" style={{ padding: "10px 16px", gap: 8 }}>
        <span style={{
          width: 18, height: 18, borderRadius: 9999, background: "var(--brand-600)",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          color: "#fff",
        }}><Icon name="thumb" size={10} strokeWidth={2.4}/></span>
        <span className="small mono">{reactions}</span>
        <div style={{ flex: 1 }}/>
        <span className="small">{post.comments} تعليق · {post.reposts} إعادة نشر</span>
      </div>

      <hr className="hr"/>

      {/* Action bar */}
      <div className="row" style={{ padding: 4 }}>
        <ActionButton icon="thumb" label={liked ? "أعجبني" : "إعجاب"} onClick={toggleLike} active={liked}/>
        <ActionButton icon="comment" label="تعليق" onClick={() => setShowComments(v => !v)}/>
        <ActionButton icon="repost" label="إعادة نشر"/>
        <ActionButton icon="send-paper" label="إرسال"/>
      </div>

      {showComments ? (
        <div style={{ padding: "4px 16px 14px", background: "var(--surface-muted)", borderTop: "1px solid var(--line-soft)" }}>
          {comments.map((c, i) => {
            const a = window.PALNET_DATA.byId[c.authorId];
            return (
              <div key={i} className="row items-start gap-2" style={{ padding: "10px 0" }}>
                <Avatar user={a} size="sm"/>
                <Surface variant="tinted" style={{ padding: "8px 12px", flex: 1, background: "var(--surface)" }}>
                  <div className="row items-center justify-between">
                    <span className="h3" style={{ fontSize: 13 }}>{a.firstName} {a.lastName}</span>
                    <span className="caption">{c.createdAt}</span>
                  </div>
                  <div className="small" style={{ color: "var(--ink)", marginTop: 2 }}>{c.body}</div>
                </Surface>
              </div>
            );
          })}
          <div className="row items-center gap-2" style={{ marginTop: 6 }}>
            <Avatar user={window.PALNET_DATA.me} size="sm"/>
            <input className="input" placeholder="اكتب تعليقاً..." style={{ borderRadius: 9999, padding: "8px 14px" }}/>
          </div>
        </div>
      ) : null}
    </Surface>
  );
}

function ActionButton({ icon, label, onClick, active }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1, padding: "10px 8px", border: 0, background: "transparent",
        cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
        color: active ? "var(--brand-700)" : "var(--ink-muted)",
        fontFamily: "var(--font-sans)", fontWeight: active ? 600 : 500, fontSize: 14,
        borderRadius: 8,
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = "var(--surface-subtle)"}
      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
    >
      <Icon name={icon} size={18}/>{label}
    </button>
  );
}

// ── Feed page ─────────────────────────────────────────────────────────────
function FeedPage({ onNavigate, onOpenProfile }) {
  const data = window.PALNET_DATA;
  return (
    <div style={{
      maxWidth: "var(--max-w)", margin: "0 auto",
      padding: "20px",
      display: "grid",
      gridTemplateColumns: "225px 1fr 300px",
      gap: 24,
      alignItems: "start",
    }}>
      {/* Left rail: mini profile */}
      <aside className="col gap-3" style={{ position: "sticky", top: "calc(var(--nav-h) + 20px)" }}>
        <Surface variant="hero" style={{ padding: 0 }}>
          <div style={{ height: 56, background: "linear-gradient(135deg, var(--brand-500), var(--brand-700))" }}/>
          <div style={{ padding: "0 16px 16px", marginTop: -28 }}>
            <Avatar user={data.me} size="lg" ring/>
            <div className="h3" style={{ marginTop: 8 }}>{data.me.firstName} {data.me.lastName}</div>
            <div className="small" style={{ marginTop: 2 }}>{data.me.headline}</div>
          </div>
          <hr className="hr"/>
          <button
            type="button"
            onClick={() => onNavigate("profile")}
            style={{
              width: "100%", padding: "10px 16px", border: 0, background: "transparent",
              display: "flex", justifyContent: "space-between", fontFamily: "var(--font-sans)",
              cursor: "pointer", fontSize: 13,
            }}
          >
            <span className="text-muted">المتابعون للملف</span>
            <span className="text-brand mono" style={{ fontWeight: 600 }}>1,284</span>
          </button>
          <button
            type="button"
            style={{
              width: "100%", padding: "10px 16px", border: 0, background: "transparent",
              display: "flex", justifyContent: "space-between", fontFamily: "var(--font-sans)",
              cursor: "pointer", fontSize: 13, borderTop: "1px solid var(--line-soft)",
            }}
          >
            <span className="text-muted">الاتصالات</span>
            <span className="text-brand mono" style={{ fontWeight: 600 }}>{data.me.connections}</span>
          </button>
        </Surface>

        <Surface variant="flat" style={{ padding: "12px 16px" }}>
          <div className="caption" style={{ marginBottom: 8 }}>وصول سريع</div>
          <div className="col gap-1">
            <QuickLink icon="bookmark" label="المحفوظات"/>
            <QuickLink icon="users" label="مجموعاتي"/>
            <QuickLink icon="calendar" label="الفعاليات"/>
          </div>
        </Surface>
      </aside>

      {/* Center: composer + feed */}
      <section className="col gap-3" style={{ minWidth: 0 }}>
        <Composer/>

        <div className="row items-center gap-2" style={{ padding: "4px 2px" }}>
          <hr className="hr" style={{ flex: 1 }}/>
          <span className="caption">المرتبة حسب الأحدث</span>
          <button className="btn ghost sm caption" style={{ padding: "2px 6px" }}>
            تغيير <Icon name="chevron-down" size={12}/>
          </button>
        </div>

        <div className="col gap-3">
          {data.posts.map(p => <PostCard key={p.id} post={p} onOpenProfile={onOpenProfile}/>)}
        </div>
      </section>

      {/* Right rail */}
      <aside className="col gap-3" style={{ position: "sticky", top: "calc(var(--nav-h) + 20px)" }}>
        <Surface variant="card" style={{ padding: 16 }}>
          <div className="row items-center justify-between" style={{ marginBottom: 8 }}>
            <span className="h3">أشخاص قد تعرفهم</span>
            <Icon name="more" size={16}/>
          </div>
          <div className="col gap-3">
            {data.people.slice(0, 4).map(p => (
              <div key={p.id} className="row items-start gap-2">
                <Avatar user={p} size="md"/>
                <div className="col grow" style={{ minWidth: 0 }}>
                  <span className="h3" style={{ fontSize: 14 }}>{p.firstName} {p.lastName}</span>
                  <span className="small truncate">{p.headline}</span>
                  <button className="btn secondary sm" style={{ marginTop: 6, width: "fit-content" }}>
                    <Icon name="plus" size={14}/> إضافة
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onNavigate("network")}
            style={{
              width: "100%", marginTop: 12, padding: "8px 0", background: "transparent",
              border: 0, color: "var(--ink-muted)", cursor: "pointer", fontSize: 13, fontWeight: 500,
              fontFamily: "var(--font-sans)",
            }}
          >عرض المزيد</button>
        </Surface>

        <Surface variant="flat" style={{ padding: 16 }}>
          <div className="h3" style={{ marginBottom: 10 }}>وظائف مقترحة</div>
          <div className="col gap-3">
            {data.jobs.map(j => (
              <div key={j.id} className="row items-start gap-3">
                <div style={{
                  width: 40, height: 40, borderRadius: 8, background: "var(--accent-50)",
                  display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent-600)",
                  fontFamily: "var(--font-sans)", fontWeight: 700,
                }}>{j.company[0]}</div>
                <div className="col" style={{ minWidth: 0 }}>
                  <span className="h3" style={{ fontSize: 14 }}>{j.title}</span>
                  <span className="small">{j.company}</span>
                  <span className="caption">{j.location} · {j.postedAt}</span>
                </div>
              </div>
            ))}
          </div>
        </Surface>

        <div className="caption" style={{ padding: "0 8px", lineHeight: 1.7 }}>
          نموذج أوّلي — بال‌نِت · شبكة مهنية لفلسطين · RTL، عربية أوّلاً · © 2026
        </div>
      </aside>
    </div>
  );
}

function QuickLink({ icon, label }) {
  return (
    <button style={{
      display: "flex", alignItems: "center", gap: 10, padding: "8px 6px",
      background: "transparent", border: 0, cursor: "pointer",
      color: "var(--ink-muted)", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 500,
      borderRadius: 6,
    }}
      onMouseEnter={(e) => e.currentTarget.style.background = "var(--surface-subtle)"}
      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
    >
      <Icon name={icon} size={16}/>{label}
    </button>
  );
}

window.FeedPage = FeedPage;