import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Mail, Send, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

const AdminSignalEmail = () => {
  const { t } = useLanguage();
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [recipients, setRecipients] = useState("");

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.refreshSession();
    return data.session?.access_token || session?.access_token || "";
  }, [session]);

  const callSettings = useCallback(async (action: string, key: string, value?: string) => {
    const token = await getToken();
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-settings`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ action, key, ...(value !== undefined && { value }) }),
      }
    );
    return res.json();
  }, [getToken]);

  useEffect(() => {
    const load = async () => {
      try {
        const [enabledRes, recipientsRes] = await Promise.all([
          callSettings("get", "signal_email_enabled"),
          callSettings("get", "signal_email_recipients"),
        ]);
        setEmailEnabled(enabledRes.value === "true");
        if (recipientsRes.value) {
          try {
            const arr = JSON.parse(recipientsRes.value);
            setRecipients(Array.isArray(arr) ? arr.join("\n") : "");
          } catch { setRecipients(""); }
        }
      } catch (e) {
        console.error("Load error:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [callSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const recipientList = recipients
        .split("\n")
        .map((e) => e.trim())
        .filter((e) => e.includes("@"));

      await Promise.all([
        callSettings("set", "signal_email_enabled", String(emailEnabled)),
        callSettings("set", "signal_email_recipients", JSON.stringify(recipientList)),
      ]);
      toast.success(t("signal_email_saved"));
    } catch {
      toast.error(t("signal_email_error"));
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    const recipientList = recipients
      .split("\n")
      .map((e) => e.trim())
      .filter((e) => e.includes("@"));

    if (recipientList.length === 0) {
      toast.error(t("signal_email_no_recipients"));
      return;
    }

    setTesting(true);
    try {
      const token = await getToken();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-signal-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            signal: {
              ticker: "AAPL",
              asset_name: "Apple Inc.",
              event_name: "MACD Bullish Crossover",
              event_type: "MacdBullishCrossoverAlert",
              sentiment: "Positive",
              importance_level: 3,
              title_en: "MACD Bullish Crossover — Apple",
              title_es: "Cruce Alcista MACD — Apple",
              title_pt: "Cruzamento de Alta MACD — Apple",
              body_en: "Apple Inc. triggered a bullish MACD crossover signal. This is a test email.",
              body_es: "Apple Inc. activó una señal alcista en el MACD. Este es un email de prueba.",
              body_pt: "A Apple Inc. acionou um cruzamento de alta no MACD. Este é um email de teste.",
            },
            recipients: recipientList,
          }),
        }
      );
      const data = await res.json();
      if (data.success) {
        toast.success(t("signal_email_test_success"));
      } else {
        toast.error(t("signal_email_test_error") + ": " + (data.error || "Unknown"));
      }
    } catch {
      toast.error(t("signal_email_test_error"));
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Mail className="h-7 w-7 text-secondary" />
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t("signal_email_title")}</h2>
          <p className="text-sm text-muted-foreground">{t("signal_email_desc")}</p>
        </div>
      </div>

      {/* Enable/Disable */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {emailEnabled ? (
                <CheckCircle className="h-5 w-5 text-emerald-500" />
              ) : (
                <XCircle className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium text-foreground">
                  {emailEnabled ? t("signal_email_enabled") : t("signal_email_disabled")}
                </p>
                <p className="text-xs text-muted-foreground">{t("signal_email_toggle")}</p>
              </div>
            </div>
            <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
          </div>
        </CardContent>
      </Card>

      {/* Sender info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("signal_email_sender")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
              SendGrid
            </Badge>
            <span className="text-sm font-mono text-foreground">marketing@venturyfx.com</span>
          </div>
        </CardContent>
      </Card>

      {/* Recipients */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("signal_email_recipients_title")}</CardTitle>
          <CardDescription>{t("signal_email_recipients_desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={recipients}
            onChange={(e) => setRecipients(e.target.value)}
            placeholder="email1@example.com&#10;email2@example.com"
            rows={5}
            className="font-mono text-sm"
          />
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t("signal_email_saving") : t("signal_email_save")}
          </Button>
        </CardContent>
      </Card>

      {/* Test */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("signal_email_test_title")}</CardTitle>
          <CardDescription>{t("signal_email_test_desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleTest} disabled={testing} variant="secondary">
            <Send className="h-4 w-4 mr-2" />
            {testing ? t("signal_email_test_sending") : t("signal_email_test_send")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSignalEmail;
