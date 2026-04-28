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
    const [rows, recipient] = await Promise.all([
      this.prisma.deviceToken.findMany({
        where: { userId: recipientId },
        select: { token: true },
      }),
      this.prisma.user.findUnique({
        where: { id: recipientId },
        select: { locale: true },
      }),
    ]);
    if (rows.length === 0) return;

    const locale = recipient?.locale ?? "ar-PS";
    const deepLink = buildDeepLink(notification);
    const messages: ExpoPushMessage[] = rows
      .map((row) => row.token)
      .filter((token) => Expo.isExpoPushToken(token))
      .map((token) => ({
        to: token,
        sound: "default",
        title: titleFor(locale),
        body: buildBody(notification, locale),
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

type Lang = "ar" | "en";

function isArabic(locale: string): boolean {
  return locale.toLowerCase().startsWith("ar");
}

function titleFor(locale: string): string {
  return isArabic(locale) ? "بيدر" : "Baydar";
}

function buildBody(notification: NotificationDto, locale: string): string {
  const lang: Lang = isArabic(locale) ? "ar" : "en";
  const actor = notification.actor
    ? `${notification.actor.firstName} ${notification.actor.lastName}`.trim()
    : null;

  const ar = (withActor: string, fallback: string): string => (actor ? withActor : fallback);
  const en = (withActor: string, fallback: string): string => (actor ? withActor : fallback);

  switch (notification.type) {
    case NotificationType.CONNECTION_REQUEST:
      return lang === "ar"
        ? ar(`${actor} أرسل لك طلب تواصل`, "لديك طلب تواصل جديد")
        : en(`${actor} sent you a connection request`, "You have a new connection request");
    case NotificationType.CONNECTION_ACCEPTED:
      return lang === "ar"
        ? ar(`${actor} قبل طلب التواصل`, "تم قبول طلب التواصل")
        : en(`${actor} accepted your connection request`, "Your connection request was accepted");
    case NotificationType.POST_REACTION:
      return lang === "ar"
        ? ar(`${actor} تفاعل مع منشورك`, "هناك تفاعل جديد على منشورك")
        : en(`${actor} reacted to your post`, "New reaction on your post");
    case NotificationType.POST_COMMENT:
      return lang === "ar"
        ? ar(`${actor} علّق على منشورك`, "هناك تعليق جديد على منشورك")
        : en(`${actor} commented on your post`, "New comment on your post");
    case NotificationType.POST_MENTION:
      return lang === "ar"
        ? ar(`${actor} أشار إليك في منشور`, "تمت الإشارة إليك في منشور")
        : en(`${actor} mentioned you in a post`, "You were mentioned in a post");
    case NotificationType.MESSAGE_RECEIVED:
      return lang === "ar"
        ? ar(`رسالة جديدة من ${actor}`, "لديك رسالة جديدة")
        : en(`New message from ${actor}`, "You have a new message");
    case NotificationType.JOB_APPLICATION_UPDATE:
      return lang === "ar" ? "هناك تحديث على طلبك الوظيفي" : "Update on your job application";
    case NotificationType.PROFILE_VIEW:
      return lang === "ar"
        ? ar(`${actor} شاهد ملفك`, "هناك زيارة جديدة لملفك")
        : en(`${actor} viewed your profile`, "Someone viewed your profile");
    default:
      return lang === "ar" ? "لديك إشعار جديد" : "You have a new notification";
  }
}

function dataString(notification: NotificationDto, key: string): string | null {
  if (!notification.data || Array.isArray(notification.data)) return null;
  const value = notification.data[key];
  return typeof value === "string" ? value : null;
}
