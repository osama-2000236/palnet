import { PostCardSkeleton } from "@baydar/ui-web";

export const Default = () => (
  <div style={{ maxWidth: 560 }}>
    <PostCardSkeleton />
  </div>
);

// What the feed actually renders while the first page loads.
export const FeedLoading = () => (
  <div style={{ display: "grid", gap: 12, maxWidth: 560 }}>
    <PostCardSkeleton />
    <PostCardSkeleton />
  </div>
);
