import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  target_user_id: string | null;
  course_id: string | null;
  is_read: boolean;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [permissionGranted, setPermissionGranted] = useState(false);

  // Request browser notification permission
  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") {
      setPermissionGranted(true);
      return true;
    }
    if (Notification.permission === "denied") return false;
    const result = await Notification.requestPermission();
    const granted = result === "granted";
    setPermissionGranted(granted);
    return granted;
  }, []);

  // Show browser notification
  const showBrowserNotification = useCallback((title: string, body: string) => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    try {
      new Notification(title, {
        body,
        icon: "/pwa-icon-192.png",
        badge: "/pwa-icon-192.png",
      });
    } catch {
      // Silent fail on unsupported platforms
    }
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    // Get all notifications visible to this user
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .or(`target_user_id.eq.${user.id},target_user_id.is.null`)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error || !data) return;

    // Get read broadcast notification IDs
    const { data: reads } = await supabase
      .from("notification_reads")
      .select("notification_id")
      .eq("user_id", user.id);

    const readIds = new Set((reads || []).map((r: any) => r.notification_id));

    const mapped: AppNotification[] = (data as any[]).map((n) => ({
      ...n,
      // For broadcasts, check notification_reads table; for targeted, use is_read column
      is_read: n.target_user_id === null ? readIds.has(n.id) : n.is_read,
    }));

    setNotifications(mapped);
    setUnreadCount(mapped.filter((n) => !n.is_read).length);
  }, [user]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user) return;

    const notif = notifications.find((n) => n.id === notificationId);
    if (!notif) return;

    if (notif.target_user_id === null) {
      // Broadcast - insert into notification_reads
      await supabase.from("notification_reads").upsert({
        user_id: user.id,
        notification_id: notificationId,
      }, { onConflict: "user_id,notification_id" });
    } else {
      // Targeted - update is_read
      await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId);
    }

    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, [user, notifications]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    const unread = notifications.filter((n) => !n.is_read);
    const broadcasts = unread.filter((n) => n.target_user_id === null);
    const targeted = unread.filter((n) => n.target_user_id !== null);

    if (broadcasts.length > 0) {
      const rows = broadcasts.map((n) => ({ user_id: user.id, notification_id: n.id }));
      await supabase.from("notification_reads").upsert(rows, { onConflict: "user_id,notification_id" });
    }

    if (targeted.length > 0) {
      const ids = targeted.map((n) => n.id);
      for (const id of ids) {
        await supabase.from("notifications").update({ is_read: true }).eq("id", id);
      }
    }

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }, [user, notifications]);

  // Initial fetch + realtime subscription
  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    // Check permission state
    if ("Notification" in window && Notification.permission === "granted") {
      setPermissionGranted(true);
    }

    // Listen for new notifications in realtime
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload: any) => {
          const newNotif = payload.new;
          // Only process if it's for this user or broadcast
          if (newNotif.target_user_id && newNotif.target_user_id !== user.id) return;

          const mapped: AppNotification = { ...newNotif, is_read: false };
          setNotifications((prev) => [mapped, ...prev]);
          setUnreadCount((prev) => prev + 1);

          // Show browser notification
          showBrowserNotification(newNotif.title, newNotif.body);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications, showBrowserNotification]);

  return {
    notifications,
    unreadCount,
    permissionGranted,
    requestPermission,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  };
}
