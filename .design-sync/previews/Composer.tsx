import { Composer } from "@baydar/ui-web";

const noop = (): void => undefined;

const me = { id: "u_1", handle: "laila-nassar", firstName: "ليلى", lastName: "نصار" };

const labels = {
  startPrompt: "ابدأ منشورًا…",
  expandedPlaceholder: "شو بدك تشارك اليوم؟",
  audienceHint: "ينشر للعموم",
  addImage: "صورة",
  addVideo: "فيديو",
  addEvent: "فعالية",
  cancel: "إلغاء",
  submit: "انشر",
  uploading: "جارٍ الرفع…",
  removeMedia: "إزالة المرفق",
  uploadFailed: "تعذّر رفع الملف. حاول مرة أخرى.",
};

export const Collapsed = () => (
  <div style={{ maxWidth: 560 }}>
    <Composer me={me} labels={labels} media={[]} onSubmit={noop} />
  </div>
);

export const Expanded = () => (
  <div style={{ maxWidth: 560 }}>
    <Composer me={me} labels={labels} media={[]} onSubmit={noop} defaultExpanded />
  </div>
);

export const WithMedia = () => (
  <div style={{ maxWidth: 560 }}>
    <Composer
      me={me}
      labels={labels}
      defaultExpanded
      onSubmit={noop}
      onRemoveMedia={noop}
      media={[
        {
          id: "m_1",
          kind: "IMAGE",
          mimeType: "image/svg+xml",
          url:
            "data:image/svg+xml;utf8," +
            encodeURIComponent(
              `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160"><rect width="240" height="160" fill="#e8e6df"/><circle cx="180" cy="46" r="24" fill="#b8bf6a"/><rect x="0" y="110" width="240" height="50" fill="#8a9a5b" opacity="0.35"/></svg>`,
            ),
        },
      ]}
    />
  </div>
);

export const WithError = () => (
  <div style={{ maxWidth: 560 }}>
    <Composer
      me={me}
      labels={labels}
      media={[]}
      defaultExpanded
      onSubmit={noop}
      error="تعذّر رفع الملف. حاول مرة أخرى."
    />
  </div>
);

export const Busy = () => (
  <div style={{ maxWidth: 560 }}>
    <Composer me={me} labels={labels} media={[]} defaultExpanded busy onSubmit={noop} />
  </div>
);
