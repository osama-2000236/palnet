import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NotificationPreferences as NotificationPreferencesSchema,
  type NotificationPreferences,
} from "@baydar/shared";
import { Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class NotificationPreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string): Promise<NotificationPreferences> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { notificationPreferences: true },
    });
    const raw = user?.notificationPreferences;
    if (raw === null || raw === undefined) return DEFAULT_NOTIFICATION_PREFERENCES;
    const parsed = NotificationPreferencesSchema.safeParse(raw);
    return parsed.success
      ? this.enforceLockedDefaults(parsed.data)
      : DEFAULT_NOTIFICATION_PREFERENCES;
  }

  async update(userId: string, prefs: NotificationPreferences): Promise<NotificationPreferences> {
    const next = this.enforceLockedDefaults(prefs);
    await this.prisma.user.update({
      where: { id: userId },
      data: { notificationPreferences: next as unknown as object },
    });
    return next;
  }

  // moderationAction is always-on per Journey & Dead Ends spec — the client
  // shows it as disabled. Server enforces regardless of what client posts.
  private enforceLockedDefaults(prefs: NotificationPreferences): NotificationPreferences {
    return {
      ...prefs,
      moderationAction: DEFAULT_NOTIFICATION_PREFERENCES.moderationAction,
    };
  }
}
