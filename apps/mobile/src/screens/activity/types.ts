import type { ConnectionListItem, Job, Profile } from "@baydar/shared";

export interface ActivityState {
  profile: Profile;
  incoming: ConnectionListItem[];
  jobs: Job[];
  unreadNotifications: number;
}

export interface ActivityMetric {
  id: string;
  label: string;
  value: number | string;
  route: string;
}

export interface ActivityTask {
  id: string;
  title: string;
  body: string;
  route: string;
  cta: string;
  tone?: "default" | "warning";
}

// expo-router colocation: not a screen.
export default (): null => null;
