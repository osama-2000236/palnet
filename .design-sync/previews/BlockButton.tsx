import { BlockButton } from "@baydar/ui-web";

const noop = (): void => undefined;

const labels = {
  block: "حظر",
  unblock: "إلغاء الحظر",
  confirmTitle: "حظر عمر حجازي؟",
  confirmBody: "لن يتمكن من مراسلتك أو رؤية منشوراتك، ولن نخبره بذلك.",
  confirmCta: "حظر",
  cancel: "إلغاء",
};

export const NotBlocked = () => (
  <BlockButton userId="u_2" isBlocked={false} onChange={noop} labels={labels} />
);

export const Blocked = () => <BlockButton userId="u_2" isBlocked onChange={noop} labels={labels} />;

export const Loading = () => (
  <BlockButton userId="u_2" isBlocked={false} onChange={noop} labels={labels} loading />
);
