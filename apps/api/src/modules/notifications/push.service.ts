import { type Notification as NotificationDto, NotificationType } from "@baydar/shared";
import { Injectable, Logger } from "@nestjs/common";
import type * as ExpoServerSdk from "expo-server-sdk";

import { PrismaService } from "../prisma/prisma.service";

type ExpoServerModule = typeof ExpoServerSdk;
type ExpoPushMessage = ExpoServerSdk.ExpoPushMessage;
type ExpoClient = InstanceType<ExpoServerModule["Expo"]>;

let expoServerModulePromise: Promise<ExpoServerModule> | null = null;

@Injectable()
export class PushService {
  private expo: ExpoClient | null = null;
  private readonly log = new Logger(PushService.name);

  constructor(private readonly prisma: PrismaService) {}

  async sendNotification(recipientId: string, notification: NotificationDto): Promise<void> {
    const { Expo, expo } = await this.getExpo();
    const rows = await this.prisma.deviceToken.findMany({
      where: { userId: recipientId },
      select: { token: true },
    });
    if (rows.length === 0) return;

    const deepLink = buildDeepLink(notification);
    const messages: ExpoPushMessage[] = rows
      .map((row) => row.token)
      .filter((token) => Expo.isExpoPushToken(token))
      .map((token) => ({
        to: token,
        sound: "default",
        title: "بيدر",
        body: buildBody(notification),
        data: deepLink ? { deepLink } : {},
      }));

    if (messages.length === 0) return;

    for (const chunk of expo.chunkPushNotifications(messages)) {
      try {
        await expo.sendPushNotificationsAsync(chunk);
      } catch (error) {
        this.log.warn(
          `Expo push chunk failed for recipient=${recipientId}: ${(error as Error).message}`,
        );
      }
    }
  }

  private async getExpo(): Promise<{ Expo: ExpoServerModule["Expo"]; expo: ExpoClient }> {
    const mod = await loadExpoServerSdk();
    this.expo ??= new mod.Expo();
    return { Expo: mod.Expo, expo: this.expo };
  }
}

function loadExpoServerSdk(): Promise<ExpoServerModule> {
  expoServerModulePromise ??= (
    Function("specifier", "return import(specifier)") as (
      specifier: string,
    ) => Promise<ExpoServerModule>
  )("expo-server-sdk");
  return expoServerModulePromise;
}

function buildDeepLink(notification: NotificationDto): string | null {
  const deepLink = dataString(notification, "deepLink");
  if (deepLink) return deepLink;

  if (notification.type === NotificationType.MESSAGE_RECEIVED) {
    const roomId = dataString(notification, "roomId");
    return roomId ? `baydar://messages/${roomId}` : null;
  }

  if (notification.type === NotificationType.JOB_APPLICATION_UPDATE) {
    return notification.jobId ? `baydar://jobs/${notification.jobId}` : null;
  }

  if (
    notification.type === NotificationType.CONNECTION_REQUEST ||
    notification.type === NotificationType.CONNECTION_ACCEPTED ||
    notification.type === NotificationType.PROFILE_VIEW
  ) {
    return notification.actor?.handle ? `baydar://u/${notification.actor.handle}` : null;
  }

  return notification.postId ? `baydar://post/${notification.postId}` : null;
}

function buildBody(notification: NotificationDto): string {
  const actor = notification.actor
    ? `${notification.actor.firstName} ${notification.actor.lastName}`.trim()
    : null;

  switch (notification.type) {
    case NotificationType.CONNECTION_REQUEST:
      return actor ? `${actor} أرسل لك طلب تواصل` : "لديك طلب تواصل جديد";
    case NotificationType.CONNECTION_ACCEPTED:
      return actor ? `${actor} قبل طلب التواصل` : "تم قبول طلب التواصل";
    case NotificationType.POST_REACTION:
      return actor ? `${actor} تفاعل مع منشورك` : "هناك تفاعل جديد على منشورك";
    case NotificationType.POST_COMMENT:
      return actor ? `${actor} علّق على منشورك` : "هناك تعليق جديد على منشورك";
    case NotificationType.POST_MENTION:
      return actor ? `${actor} أشار إليك في منشور` : "تمت الإشارة إليك في منشور";
    case NotificationType.MESSAGE_RECEIVED:
      return actor ? `رسالة جديدة من ${actor}` : "لديك رسالة جديدة";
    case NotificationType.JOB_APPLICATION_UPDATE:
      return "هناك تحديث على طلبك الوظيفي";
    case NotificationType.PROFILE_VIEW:
      return actor ? `${actor} شاهد ملفك` : "هناك زيارة جديدة لملفك";
    default:
      return "لديك إشعار جديد";
  }
}

function dataString(notification: NotificationDto, key: string): string | null {
  if (!notification.data || Array.isArray(notification.data)) return null;
  const value = notification.data[key];
  return typeof value === "string" ? value : null;
}
