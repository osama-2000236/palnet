import { TypingIndicator } from "@baydar/ui-web";

// TypingIndicator renders an <li> — it belongs to the message list, so the
// preview composes the list around it.
export const InThread = () => (
  <ul
    style={{
      display: "flex",
      flexDirection: "column",
      gap: 8,
      maxWidth: 420,
      margin: 0,
      padding: 0,
      listStyle: "none",
    }}
  >
    <TypingIndicator label="ليلى تكتب…" />
  </ul>
);
