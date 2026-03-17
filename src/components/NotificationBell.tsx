import { useState, useRef, useEffect } from "react";
import { Bell, BellRing, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/useNotifications";
import { useLanguage } from "@/i18n/LanguageContext";
import { formatDistanceToNow } from "date-fns";
import { es, ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, permissionGranted, requestPermission, markAsRead, markAllAsRead } = useNotifications();
  const { lang, t } = useLanguage();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleOpen = () => {
    setOpen((v) => !v);
    if (!permissionGranted) requestPermission();
  };

  const dateLocale = lang === "es" ? es : ptBR;

  return (
    <div className="relative" ref={ref}>
      <Button variant="ghost" size="icon" onClick={handleOpen} className="relative text-primary-foreground/80 hover:text-gold hover:bg-navy-light/50">
        {unreadCount > 0 ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute right-0 top-full mt-2 w-80 max-h-96 bg-background border border-border rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">{t("notif_title")}</h3>
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="text-xs text-secondary hover:text-primary flex items-center gap-1">
                  <CheckCheck className="h-3 w-3" /> {t("notif_mark_all_read")}
                </button>
              )}
            </div>

            <div className="overflow-y-auto max-h-72">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {t("notif_empty")}
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => !n.is_read && markAsRead(n.id)}
                    className={`px-4 py-3 border-b border-border/50 cursor-pointer transition-colors hover:bg-muted/50 ${
                      !n.is_read ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!n.is_read ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                          {n.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: dateLocale })}
                        </p>
                      </div>
                      {!n.is_read && (
                        <span className="mt-1 h-2 w-2 rounded-full bg-secondary shrink-0" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {!permissionGranted && "Notification" in window && (
              <div className="px-4 py-2 border-t border-border bg-muted/30">
                <button onClick={requestPermission} className="text-xs text-secondary hover:underline w-full text-center">
                  {t("notif_enable_browser")}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
