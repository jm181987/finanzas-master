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

// Use `as any` for tables not yet in generated types
const notificationsTable = () => (supabase.from as any)("notifications");
const readsTable = () => (supabase.from as any)("notification_reads");

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [permissionGranted, setPermissionGranted] = useState(false);

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") { setPermissionGranted(true); return true; }
    if (Notification.permission === "denied") return false;
    const result = await Notification.requestPermission();
    const granted = result === "granted";
    setPermissionGranted(granted);
    return granted;
  }, []);

  const showBrowserNotification = useCallback((title: string, body: string) => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    try { new Notification(title, { body, icon: "/pwa-icon-192.png", badge: "/pwa-icon-192.png" }); } catch {}
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data, error } = await notificationsTable()
      .select("*")
      .or(`target_user_id.eq.${user.id},target_user_id.is.null`)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error || !data) return;

    const { data: reads } = await readsTable().select("notification_id").eq("user_id", user.id);
    const readIds = new Set((reads || []).map((r: any) => r.notification_id));

    const mapped: AppNotification[] = (data as any[]).map((n: any) => ({
      ...n,
      is_read: n.target_user_id === null ? readIds.has(n.id) : n.is_read,
    }));
    setNotifications(mapped);
    setUnreadCount(mapped.filter((n) => !n.is_read).length);
  }, [user]);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user) return;
    const notif = notifications.find((n) => n.id === notificationId);
    if (!notif) return;
    if (notif.target_user_id === null) {
      await readsTable().upsert({ user_id: user.id, notification_id: notificationId }, { onConflict: "user_id,notification_id" });
    } else {
      await notificationsTable().update({ is_read: true }).eq("id", notificationId);
    }
    setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, [user, notifications]);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    const unread = notifications.filter((n) => !n.is_read);
    const broadcasts = unread.filter((n) => n.target_user_id === null);
    const targeted = unread.filter((n) => n.target_user_id !== null);
    if (broadcasts.length > 0) {
      await readsTable().upsert(broadcasts.map((n) => ({ user_id: user.id, notification_id: n.id })), { onConflict: "user_id,notification_id" });
    }
    for (const n of targeted) {
      await notificationsTable().update({ is_read: true }).eq("id", n.id);
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }, [user, notifications]);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    if ("Notification" in window && Notification.permission === "granted") setPermissionGranted(true);

    const channel = supabase
      .channel("notifications-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (payload: any) => {
        const n = payload.new;
        if (n.target_user_id && n.target_user_id !== user.id) return;
        setNotifications((prev) => [{ ...n, is_read: false }, ...prev]);
        setUnreadCount((prev) => prev + 1);
        showBrowserNotification(n.title, n.body);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchNotifications, showBrowserNotification]);

  return { notifications, unreadCount, permissionGranted, requestPermission, markAsRead, markAllAsRead, refetch: fetchNotifications };
}
