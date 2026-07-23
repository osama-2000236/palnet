import type {
  SearchCompanyHit,
  SearchJobHit,
  SearchPersonHit,
  SearchPostHit,
} from "@baydar/shared";
import { Avatar, Button, RecordCard } from "@baydar/ui-native";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { runConnectionAction } from "@/lib/connections";
import { successHaptic, tapHaptic } from "@/lib/haptics";
import { getAccessToken } from "@/lib/session";

type SearchType = "people" | "posts" | "jobs" | "companies";
type SearchHit = SearchPersonHit | SearchPostHit | SearchJobHit | SearchCompanyHit;

export function SearchRow({ type, item }: { type: SearchType; item: SearchHit }): JSX.Element {
  if (type === "posts") return <PostRow item={item as SearchPostHit} />;
  if (type === "jobs") return <JobRow item={item as SearchJobHit} />;
  if (type === "companies") return <CompanyRow item={item as SearchCompanyHit} />;
  return <PersonRow item={item as SearchPersonHit} />;
}

function PersonRow({ item }: { item: SearchPersonHit }): JSX.Element {
  const { t } = useTranslation();
  const name = `${item.firstName} ${item.lastName}`.trim();
  // Web parity: a people result acts, it does not just link to a profile.
  const [viewer, setViewer] = useState(item.viewer);
  const [busy, setBusy] = useState(false);

  const outgoingPending =
    viewer.connection?.status === "PENDING" && viewer.connection.direction === "OUTGOING";
  const connectable = !viewer.isSelf && !viewer.connection;

  async function act(): Promise<void> {
    const token = await getAccessToken();
    if (!token || busy) return;
    setBusy(true);
    try {
      tapHaptic();
      setViewer(
        await runConnectionAction(
          outgoingPending ? "WITHDRAW" : "CONNECT",
          viewer,
          item.userId,
          token,
        ),
      );
      successHaptic();
    } catch {
      // The profile screen owns the retry + error surface.
    } finally {
      setBusy(false);
    }
  }

  return (
    <RecordCard
      onPress={() => router.push(`/(app)/in/${item.handle}`)}
      accessibilityLabel={name}
      leading={
        <Avatar
          user={{
            id: item.userId,
            handle: item.handle,
            firstName: item.firstName,
            lastName: item.lastName,
            avatarUrl: item.avatarUrl,
          }}
          size="md"
        />
      }
      title={name}
      subtitle={item.headline}
      meta={`@${item.handle}`}
      metaDirection="ltr"
      trailing={
        connectable || outgoingPending ? (
          <Button
            variant={outgoingPending ? "ghost" : "secondary"}
            size="sm"
            loading={busy}
            onPress={() => void act()}
          >
            {t(outgoingPending ? "network.withdraw" : "network.connect")}
          </Button>
        ) : null
      }
    />
  );
}

function PostRow({ item }: { item: SearchPostHit }): JSX.Element {
  return (
    <RecordCard
      onPress={() => router.push(`/(app)/in/${item.authorHandle}`)}
      accessibilityLabel={item.authorDisplayName}
      leading={
        <Avatar
          user={{
            id: item.authorId,
            handle: item.authorHandle,
            firstName: item.authorDisplayName,
            lastName: "",
            avatarUrl: item.authorAvatarUrl,
          }}
          size="md"
        />
      }
      title={item.authorDisplayName}
      subtitle={item.bodyExcerpt}
      meta={`/${item.authorHandle}`}
      metaDirection="ltr"
    />
  );
}

function JobRow({ item }: { item: SearchJobHit }): JSX.Element {
  const location = [item.city, item.country].filter(Boolean).join(", ");
  return (
    <RecordCard
      onPress={() => router.push(`/(app)/jobs/${item.id}`)}
      accessibilityLabel={item.title}
      title={item.title}
      subtitle={item.companyName}
      meta={[location, item.locationMode, item.type].filter(Boolean).join(" · ")}
    />
  );
}

function CompanyRow({ item }: { item: SearchCompanyHit }): JSX.Element {
  const { t } = useTranslation();
  const location = [item.city, item.country].filter(Boolean).join(", ");
  const jobsLabel =
    item.activeJobs > 0 ? t("search.activeJobsCount", { count: item.activeJobs }) : null;
  return (
    <RecordCard
      onPress={() =>
        router.push({
          pathname: "/(app)/company/[slug]",
          params: { slug: item.slug },
        } as never)
      }
      accessibilityLabel={item.name}
      title={item.verified ? `${item.name} · ${t("search.verified")}` : item.name}
      subtitle={item.tagline ?? item.industry}
      meta={[item.industry, location, jobsLabel].filter(Boolean).join(" · ")}
    />
  );
}

// expo-router colocation: not a screen.
export default (): null => null;
