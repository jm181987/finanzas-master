import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Send, Users, User, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { es, ptBR } from "date-fns/locale";

const AdminNotifications = () => {
  const { user } = useAuth();
  const { lang, t } = useLanguage();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("manual");
  const [targetType, setTargetType] = useState<"all" | "user">("all");
  const [targetUserId, setTargetUserId] = useState("");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  const dateLocale = lang === "es" ? es : ptBR;

  useEffect(() => {
    loadHistory();
    loadUsers();
  }, []);

  const loadHistory = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setHistory(data as any[]);
  };

  const loadUsers = async () => {
    const { data } = await supabase.from("profiles").select("id, full_name").order("full_name");
    if (data) setUsers(data);
  };

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error(t("notif_admin_error_empty"));
      return;
    }

    setSending(true);
    const payload: any = {
      title: title.trim(),
      body: body.trim(),
      type,
      created_by: user?.id,
      target_user_id: targetType === "user" && targetUserId ? targetUserId : null,
    };

    const { error } = await supabase.from("notifications").insert(payload);
    setSending(false);

    if (error) {
      toast.error("Error: " + error.message);
      return;
    }

    toast.success(t("notif_admin_sent"));
    setTitle("");
    setBody("");
    loadHistory();
  };

  const typeIcon = (t: string) => {
    if (t === "new_course") return <BookOpen className="h-4 w-4" />;
    if (t === "study_reminder") return <Bell className="h-4 w-4" />;
    return <Send className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="h-6 w-6 text-secondary" />
        <h1 className="text-2xl font-bold text-foreground">{t("notif_admin_title")}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Send form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Send className="h-5 w-5 text-secondary" />
              {t("notif_admin_send_new")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("notif_admin_notif_title")}</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("notif_admin_title_placeholder")} />
            </div>

            <div className="space-y-1.5">
              <Label>{t("notif_admin_body")}</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder={t("notif_admin_body_placeholder")} rows={3} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t("notif_admin_type")}</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">{t("notif_type_manual")}</SelectItem>
                    <SelectItem value="new_course">{t("notif_type_new_course")}</SelectItem>
                    <SelectItem value="study_reminder">{t("notif_type_study_reminder")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>{t("notif_admin_target")}</Label>
                <Select value={targetType} onValueChange={(v) => setTargetType(v as "all" | "user")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {t("notif_target_all")}</span>
                    </SelectItem>
                    <SelectItem value="user">
                      <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> {t("notif_target_user")}</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {targetType === "user" && (
              <div className="space-y-1.5">
                <Label>{t("notif_admin_select_user")}</Label>
                <Select value={targetUserId} onValueChange={setTargetUserId}>
                  <SelectTrigger><SelectValue placeholder={t("notif_admin_select_user_placeholder")} /></SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.full_name || u.id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button onClick={handleSend} disabled={sending} className="w-full">
              <Send className="h-4 w-4 mr-2" />
              {sending ? t("notif_admin_sending") : t("notif_admin_send")}
            </Button>
          </CardContent>
        </Card>

        {/* History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("notif_admin_history")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">{t("notif_admin_no_history")}</p>
              ) : (
                history.map((n) => (
                  <div key={n.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                    <div className="mt-0.5 text-muted-foreground">{typeIcon(n.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{n.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground/60">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: dateLocale })}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {n.target_user_id ? t("notif_target_user") : t("notif_target_all")}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminNotifications;
