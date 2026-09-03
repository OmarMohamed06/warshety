/**
 * pushNotificationService — sends real device push notifications (FCM/APNs)
 * alongside the in-app `notifications` rows created by
 * inAppNotificationService.ts, using the tokens the Flutter app registers
 * in `device_tokens` (see supabase/device_tokens_schema.sql).
 *
 * No-ops (logs once, never throws) until FIREBASE_SERVICE_ACCOUNT_JSON is set
 * — a broken/unconfigured push path must never fail the booking/points/review
 * action that triggered it. See docs/push_notifications_setup.md.
 */

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { createClient } from "@supabase/supabase-js";

let app: App | null | undefined;

function getFirebaseApp(): App | null {
  if (app !== undefined) return app;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    console.warn(
      "[pushNotificationService] FIREBASE_SERVICE_ACCOUNT_JSON not set — push notifications disabled.",
    );
    app = null;
    return app;
  }

  try {
    const serviceAccount = JSON.parse(raw);
    app =
      getApps().length > 0
        ? getApps()[0]
        : initializeApp({ credential: cert(serviceAccount) });
  } catch (err) {
    console.error(
      "[pushNotificationService] Failed to initialize Firebase Admin:",
      err,
    );
    app = null;
  }
  return app;
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

/**
 * Sends a push to every device registered for a user. Mirrors the in-app
 * notification's title/body/type/referenceId so tapping the push lands on
 * the same screen tapping the bell notification would
 * (see lib/features/notifications/domain/notification.dart#notificationRoute).
 */
export async function sendPushNotification({
  userId,
  title,
  body,
  type,
  referenceId,
}: {
  userId: string;
  title: string;
  body: string;
  type: string;
  referenceId?: string;
}): Promise<void> {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return;

  try {
    const supabase = getServiceClient();
    const { data: tokens } = await supabase
      .from("device_tokens")
      .select("token")
      .eq("user_id", userId);

    if (!tokens || tokens.length === 0) return;

    const messaging = getMessaging(firebaseApp);
    const response = await messaging.sendEachForMulticast({
      tokens: tokens.map((t) => t.token as string),
      notification: { title, body },
      data: { type, ...(referenceId ? { referenceId } : {}) },
    });

    // Prune tokens FCM reports as dead so future sends stop retrying them.
    const staleTokens: string[] = [];
    response.responses.forEach((r, i) => {
      const code = r.error?.code;
      if (
        !r.success &&
        (code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token")
      ) {
        staleTokens.push(tokens[i].token as string);
      }
    });
    if (staleTokens.length > 0) {
      await supabase.from("device_tokens").delete().in("token", staleTokens);
    }
  } catch (err) {
    console.error("[pushNotificationService] send failed:", err);
  }
}
