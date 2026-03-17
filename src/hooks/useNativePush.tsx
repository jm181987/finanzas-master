import { useEffect, useCallback, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const notificationsTable = () => (supabase.from as any)("push_tokens");

export function useNativePush() {
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(null);

  const registerPush = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;
    if (!user) return;

    const permResult = await PushNotifications.requestPermissions();
    if (permResult.receive !== "granted") return;

    await PushNotifications.register();
  }, [user]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (!user) return;

    // Listen for registration success
    PushNotifications.addListener("registration", async (tokenData) => {
      setToken(tokenData.value);
      // Save token to database
      await notificationsTable().upsert(
        { user_id: user.id, token: tokenData.value, platform: Capacitor.getPlatform() },
        { onConflict: "user_id,token" }
      );
    });

    // Listen for push received while app is open
    PushNotifications.addListener("pushNotificationReceived", (notification) => {
      console.log("Push received:", notification);
    });

    // Listen for push action (user tapped notification)
    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      console.log("Push action:", action);
    });

    registerPush();

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [user, registerPush]);

  return { token, registerPush, isNative: Capacitor.isNativePlatform() };
}
