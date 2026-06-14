import type {
  SearchCompanyHit,
  SearchJobHit,
  SearchPersonHit,
  SearchPostHit,
} from "@baydar/shared";
import { Avatar, RecordCard } from "@baydar/ui-native";
import { router } from "expo-router";

type SearchType = "people" | "posts" | "jobs" | "companies";
type SearchHit = SearchPersonHit | SearchPostHit | SearchJobHit | SearchCompanyHit;

export function SearchRow({ type, item }: { type: SearchType; item: SearchHit }): JSX.Element {
  if (type === "posts") return <PostRow item={item as SearchPostHit} />;
  if (type === "jobs") return <JobRow item={item as SearchJobHit} />;
  if (type === "companies") return <CompanyRow item={item as SearchCompanyHit} />;
  return <PersonRow item={item as SearchPersonHit} />;
}

function PersonRow({ item }: { item: SearchPersonHit }): JSX.Element {
  const name = `${item.firstName} ${item.lastName}`.trim();
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
      meta={`/in/${item.handle}`}
      metaDirection="ltr"
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
  const location = [item.city, item.country].filter(Boolean).join(", ");
  return (
    <RecordCard
      onPress={() => router.push(`/(app)/employer/${item.slug}`)}
      accessibilityLabel={item.name}
      title={item.name}
      subtitle={item.tagline}
      meta={[item.industry, location].filter(Boolean).join(" · ")}
    />
  );
}
