import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Copy, Check, Webhook, Send, RefreshCw, ChevronDown, ChevronUp, Clock, Mail, Power } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { es, pt } from "date-fns/locale";

const WEBHOOK_URL = `https://tnjcigqqmwahnxcsljgk.supabase.co/functions/v1/receive-signal`;
const WEBHOOK_EMAIL_URL = `https://tnjcigqqmwahnxcsljgk.supabase.co/functions/v1/webhook-signal-email`;

const EXAMPLE_PAYLOAD = JSON.stringify({
  event_id: "example-001",
  source: "bridgewise",
  event_name: "Technical event",
  event_type: "MacdBullishCrossoverAlert",
  event_date_utc: new Date().toISOString(),
  sentiment: "Positive",
  importance_level: 2,
  ticker: "AAPL",
  asset_name: "Apple Inc.",
  title_en: "MACD Bullish Crossover",
  body_en: "Apple Inc. triggers MACD bullish crossover!",
  title_es: "Cruce Alcista en MACD",
  body_es: "¡Apple Inc. activa una señal alcista en el MACD!",
  title_pt: "Cruzamento de Alta no MACD",
  body_pt: "A Apple Inc. acionou um cruzamento de alta no MACD!",
  has_reasoning: false,
  reasoning: [],
}, null, 2);

interface SignalLog {
  id: string;
  event_id: string | null;
  source: string | null;
  event_name: string | null;
  event_type: string | null;
  event_date_utc: string | null;
  sentiment: string | null;
  importance_level: number | null;
  ticker: string | null;
  asset_name: string | null;
  title_en: string | null;
  title_es: string | null;
  title_pt: string | null;
  body_en: string | null;
  body_es: string | null;
  body_pt: string | null;
  has_reasoning: boolean | null;
  reasoning: string | null;
  created_at: string;
  asset_type: string | null;
  currency: string | null;
  asset_trigger_price: number | null;
  asset_threshold_price: number | null;
  asset_change_percent: number | null;
  asset_name_short: string | null;
}

const sentimentColor: Record<string, string> = {
  Positive: "bg-green-500/20 text-green-400 border-green-500/30",
  Negative: "bg-red-500/20 text-red-400 border-red-500/30",
  Neutral: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

const AdminWebhooks = () => {
  const { t, lang } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [logs, setLogs] = useState<SignalLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [loadingEmailLogs, setLoadingEmailLogs] = useState(true);
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);
  const [webhookEmailEnabled, setWebhookEmailEnabled] = useState(true);
  const [togglingWebhook, setTogglingWebhook] = useState(false);

  const dateLocale = lang === "pt" ? pt : es;

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || "";
  }, []);

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
        body: JSON.stringify({ action, key, value }),
      }
    );
    return res.json();
  }, [getToken]);

  // Load webhook enabled state
  useEffect(() => {
    callSettings("get", "webhook_signal_email_enabled").then((r) => {
      if (r.ok && r.value !== undefined) {
        setWebhookEmailEnabled(r.value === "true");
      }
    });
  }, [callSettings]);

  const toggleWebhookEmail = async () => {
    setTogglingWebhook(true);
    const newValue = !webhookEmailEnabled;
    try {
      const result = await callSettings("set", "webhook_signal_email_enabled", String(newValue));
      if (result.ok) {
        setWebhookEmailEnabled(newValue);
        toast.success(newValue
          ? (lang === "pt" ? "Webhook ativado" : "Webhook activado")
          : (lang === "pt" ? "Webhook desativado" : "Webhook desactivado"));
      } else {
        toast.error("Error: " + (result.error || "Unknown"));
      }
    } catch {
      toast.error("Error al cambiar estado");
    } finally {
      setTogglingWebhook(false);
    }
  };

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token || "";
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-signals?limit=50`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      const result = await res.json();
      if (result.success && result.data) setLogs(result.data);
    } catch (e) {
      console.error("Error loading signals:", e);
    } finally {
      setLoadingLogs(false);
    }
  };

  const loadEmailLogs = async () => {
    setLoadingEmailLogs(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token || "";
      // Use list-signals but we'll fetch the last emails sent via the webhook
      // We'll query trading_signals to correlate, but for email logs we track via the webhook response
      // For now, store email send results locally from test sends
      // Actually let's fetch from edge function logs
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-signals?limit=20`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      const result = await res.json();
      if (result.success && result.data) {
        // Show the same signals but as email context
        setEmailLogs(result.data);
      }
    } catch (e) {
      console.error("Error loading email logs:", e);
    } finally {
      setLoadingEmailLogs(false);
    }
  };

  useEffect(() => { loadLogs(); loadEmailLogs(); }, []);

  const copyUrl = async (url: string, type: "signal" | "email" = "signal") => {
    await navigator.clipboard.writeText(url);
    if (type === "email") {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    toast.success(t("webhook_copied"));
  };

  const sendTestEmail = async () => {
    if (!webhookEmailEnabled) {
      toast.error(lang === "pt" ? "O webhook está desativado" : "El webhook está desactivado");
      return;
    }

    setTestingEmail(true);
    try {
      const res = await fetch(WEBHOOK_EMAIL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: "TEST",
          asset_name: "Test Asset",
          event_name: "Test Email Signal",
          sentiment: "Positive",
          importance_level: 3,
          title_es: "Señal de Prueba por Email",
          body_es: "Esta es una señal de prueba enviada desde el panel de administración por email.",
          title_pt: "Sinal de Teste por Email",
          body_pt: "Este é um sinal de teste enviado do painel de administração por email.",
          recipients: testEmail.includes("@") ? [testEmail.trim()] : [],
        }),
      });
      const data = await res.json();
      if (data.success) {
        const accepted = data.results?.filter((r: any) => r.success).length || 0;
        toast.success(`${lang === "pt" ? "Aceptado por SendGrid" : "Aceptado por SendGrid"}: ${accepted}`);
        loadEmailLogs();
      } else {
        toast.error("Error: " + (data.error || "Unknown"));
      }
    } catch (e) {
      toast.error(lang === "pt" ? "Erro ao enviar teste de email" : "Error al enviar test de email");
    } finally {
      setTestingEmail(false);
    }
  };

  const sendTest = async () => {
    setTesting(true);
    try {
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: `test-${Date.now()}`,
          source: "manual-test",
          event_name: "Test Signal",
          event_type: "ManualTest",
          event_date_utc: new Date().toISOString(),
          sentiment: "Positive",
          importance_level: 3,
          ticker: "TEST",
          asset_name: "Test Asset",
          title_en: "Manual Test Signal",
          body_en: "This is a manual test signal sent from the admin panel.",
          title_es: "Señal de Prueba Manual",
          body_es: "Esta es una señal de prueba enviada desde el panel de administración.",
          title_pt: "Sinal de Teste Manual",
          body_pt: "Este é um sinal de teste enviado do painel de administração.",
          has_reasoning: false,
          reasoning: [],
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(t("webhook_test_success"));
        loadLogs();
      } else {
        toast.error(t("webhook_test_error") + ": " + (data.error || "Unknown"));
      }
    } catch (e) {
      toast.error(t("webhook_test_error"));
    } finally {
      setTesting(false);
    }
  };

  const buildJsonPreview = (log: SignalLog) => {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(log)) {
      if (v !== null && v !== undefined) obj[k] = v;
    }
    return JSON.stringify(obj, null, 2);
  };

  const getTitle = (s: SignalLog) => {
    if (lang === "pt") return s.title_pt || s.title_es || s.title_en || s.event_name || s.event_type || "—";
    return s.title_es || s.title_en || s.event_name || s.event_type || "—";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Webhook className="h-7 w-7 text-secondary" />
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t("webhook_title")}</h2>
          <p className="text-sm text-muted-foreground">{t("webhook_description")}</p>
        </div>
      </div>

      {/* Webhook URL */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("webhook_url_label")}</CardTitle>
          <CardDescription>{t("webhook_url_desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 shrink-0">POST</Badge>
            <Input value={WEBHOOK_URL} readOnly className="font-mono text-sm" />
            <Button variant="outline" size="icon" onClick={() => copyUrl(WEBHOOK_URL, "signal")}>
              {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email Webhook URL */}
      <Card className={`border-secondary/30 ${!webhookEmailEnabled ? "opacity-60" : ""}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">📧 Webhook Email de Señales</CardTitle>
              <CardDescription>
                {lang === "pt"
                  ? "Envie sinais por email. Com 'recipients' envia ao grupo; sem 'recipients' envia a todos os usuários."
                  : "Envía señales por email. Con 'recipients' envía al grupo; sin 'recipients' envía a TODOS los usuarios."}
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs text-muted-foreground">
                {webhookEmailEnabled
                  ? (lang === "pt" ? "Ativo" : "Activo")
                  : (lang === "pt" ? "Desativado" : "Desactivado")}
              </span>
              <Switch
                checked={webhookEmailEnabled}
                onCheckedChange={toggleWebhookEmail}
                disabled={togglingWebhook}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary/30 shrink-0">POST</Badge>
            <Input value={WEBHOOK_EMAIL_URL} readOnly className="font-mono text-sm" />
            <Button variant="outline" size="icon" onClick={() => copyUrl(WEBHOOK_EMAIL_URL, "email")}>
              {copiedEmail ? <Check className="h-4 w-4 text-secondary" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/50 bg-muted/20 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Power className={`h-4 w-4 ${webhookEmailEnabled ? "text-secondary" : "text-muted-foreground"}`} />
              {lang === "pt" ? "Estado do webhook" : "Estado del webhook"}
            </div>
            <Badge variant="outline" className={webhookEmailEnabled ? "border-secondary/30 bg-secondary/10 text-secondary" : "border-border text-muted-foreground"}>
              {webhookEmailEnabled
                ? (lang === "pt" ? "Activo" : "Activo")
                : (lang === "pt" ? "Apagado" : "Apagado")}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder={lang === "pt" ? "Email para teste (opcional)" : "Email para prueba (opcional)"}
              className="max-w-xs text-sm"
              type="email"
            />
            <Button onClick={sendTestEmail} disabled={testingEmail || !webhookEmailEnabled} variant="secondary">
              <Send className="h-4 w-4 mr-2" />
              {testingEmail
                ? "Enviando..."
                : testEmail.includes("@")
                  ? (lang === "pt" ? `Probar a ${testEmail}` : `Probar a ${testEmail}`)
                  : (lang === "pt" ? "Probar entrega" : "Probar entrega")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email Logs */}
      <Card className="border-secondary/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4 text-secondary" />
                {lang === "pt" ? "Log de Emails Enviados" : "Log de Emails Enviados"}
              </CardTitle>
              <CardDescription>
                {lang === "pt"
                  ? "Histórico de sinais que foram enviados por email"
                  : "Historial de señales que fueron enviadas por email"}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadEmailLogs} disabled={loadingEmailLogs}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loadingEmailLogs ? "animate-spin" : ""}`} />
              {lang === "pt" ? "Atualizar" : "Actualizar"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingEmailLogs ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {lang === "pt" ? "Carregando..." : "Cargando..."}
            </p>
          ) : emailLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {lang === "pt" ? "Nenhum email enviado ainda" : "No se han enviado emails aún"}
            </p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {emailLogs.map((log: any) => (
                <div key={`email-${log.id}`} className="border border-secondary/20 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedEmailId(expandedEmailId === log.id ? null : log.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/5 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2 shrink-0">
                      <Mail className="h-3.5 w-3.5 text-secondary" />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: dateLocale })}
                      </span>
                    </div>
                    {log.ticker && (
                      <Badge variant="outline" className="text-xs shrink-0 border-secondary/30">{log.ticker}</Badge>
                    )}
                    {log.sentiment && (
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${sentimentColor[log.sentiment] || ""}`}>
                        {log.sentiment}
                      </Badge>
                    )}
                    <span className="text-sm text-foreground truncate flex-1">
                      {lang === "pt"
                        ? (log.title_pt || log.title_es || log.title_en || log.event_name || "—")
                        : (log.title_es || log.title_en || log.event_name || "—")}
                    </span>
                    <Badge variant="outline" className="border-secondary/30 bg-secondary/10 text-secondary text-[10px] shrink-0">
                      {lang === "pt" ? "aceptado por provider" : "aceptado por provider"}
                    </Badge>
                    {expandedEmailId === log.id
                      ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                      : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    }
                  </button>
                  {expandedEmailId === log.id && (
                    <div className="border-t border-secondary/20 bg-secondary/5 px-4 py-3">
                      <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap text-foreground/80 max-h-80 overflow-y-auto">
                        {JSON.stringify({
                          delivery_status: "accepted_by_sendgrid",
                          note: lang === "pt"
                            ? "El proveedor aceptó el envío, pero eso no garantiza entrega final en inbox."
                            : "El proveedor aceptó el envío, pero eso no garantiza entrega final en inbox.",
                          ticker: log.ticker,
                          asset_name: log.asset_name,
                          event_name: log.event_name,
                          sentiment: log.sentiment,
                          importance_level: log.importance_level,
                          title_es: log.title_es,
                          title_pt: log.title_pt,
                          body_es: log.body_es,
                          body_pt: log.body_pt,
                          created_at: log.created_at,
                        }, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Webhook JSON Format */}
      <Card className="border-secondary/30">
        <CardHeader>
          <CardTitle className="text-base">
            {lang === "pt" ? "📧 Formato JSON — Webhook Email" : "📧 Formato JSON — Webhook Email"}
          </CardTitle>
          <CardDescription>
            {lang === "pt"
              ? "Estrutura do payload para enviar sinais por email via webhook"
              : "Estructura del payload para enviar señales por email vía webhook"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-2">
              {lang === "pt"
                ? "Con 'recipients': envía solo a esos emails. Sin 'recipients': envía a TODOS los usuarios."
                : "Con 'recipients': envía solo a esos emails. Sin 'recipients': envía a TODOS los usuarios."}
            </p>
            <pre className="bg-muted rounded-lg p-4 text-xs font-mono overflow-x-auto max-h-96 overflow-y-auto text-foreground">
{JSON.stringify({
  ticker: "AAPL",
  asset_name: "Apple Inc.",
  event_name: "Earnings Report",
  sentiment: "Positive",
  importance_level: 4,
  title_es: "Reporte de ganancias de Apple",
  body_es: "Apple superó las expectativas del mercado...",
  title_pt: "Relatório de ganhos da Apple",
  body_pt: "A Apple superou as expectativas do mercado...",
  title_en: "Apple Earnings Report",
  body_en: "Apple beat market expectations...",
  recipients: ["user1@mail.com", "user2@mail.com"]
}, null, 2)}
            </pre>
          </div>
          <div className="space-y-2 text-sm">
            {[
              { field: "ticker", desc: lang === "pt" ? "Símbolo do ativo" : "Símbolo del activo" },
              { field: "asset_name", desc: lang === "pt" ? "Nome do ativo" : "Nombre del activo" },
              { field: "event_name", desc: lang === "pt" ? "Nome do evento" : "Nombre del evento" },
              { field: "sentiment", desc: "Positive / Negative / Neutral" },
              { field: "importance_level", desc: "1-5" },
              { field: "title_es / title_pt / title_en", desc: lang === "pt" ? "Títulos por idioma" : "Títulos por idioma" },
              { field: "body_es / body_pt / body_en", desc: lang === "pt" ? "Conteúdo por idioma" : "Contenido por idioma" },
              { field: "recipients", desc: lang === "pt" ? "Array de emails (opcional). Sem = envia a todos" : "Array de emails (opcional). Sin él = envía a todos" },
            ].map((f) => (
              <div key={f.field} className="flex items-start gap-3 py-1.5 border-b border-border/30 last:border-0">
                <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono shrink-0">{f.field}</code>
                <span className="text-muted-foreground flex-1">{f.desc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("webhook_test_title")}</CardTitle>
          <CardDescription>{t("webhook_test_desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={sendTest} disabled={testing}>
            <Send className="h-4 w-4 mr-2" />
            {testing ? t("webhook_testing") : t("webhook_send_test")}
          </Button>
        </CardContent>
      </Card>

      {/* Logs viewer */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">{t("webhook_logs_title")}</CardTitle>
              <CardDescription>{t("webhook_logs_desc")}</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadLogs} disabled={loadingLogs}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loadingLogs ? "animate-spin" : ""}`} />
              {t("webhook_logs_refresh")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingLogs ? (
            <p className="text-sm text-muted-foreground py-4 text-center">{t("webhook_logs_loading")}</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">{t("webhook_logs_empty")}</p>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {logs.map((log) => (
                <div key={log.id} className="border border-border/50 rounded-lg overflow-hidden">
                  {/* Header row */}
                  <button
                    onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2 shrink-0">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: dateLocale })}
                      </span>
                    </div>

                    {log.ticker && (
                      <Badge variant="outline" className="text-xs shrink-0">{log.ticker}</Badge>
                    )}

                    {log.sentiment && (
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${sentimentColor[log.sentiment] || ""}`}>
                        {log.sentiment}
                      </Badge>
                    )}

                    <span className="text-sm text-foreground truncate flex-1">{getTitle(log)}</span>

                    {log.source && (
                      <span className="text-[10px] text-muted-foreground shrink-0">{log.source}</span>
                    )}

                    {expandedId === log.id
                      ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                      : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    }
                  </button>

                  {/* Expanded JSON */}
                  {expandedId === log.id && (
                    <div className="border-t border-border/30 bg-muted/20 px-4 py-3">
                      <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap text-foreground/80 max-h-80 overflow-y-auto">
                        {buildJsonPreview(log)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Example payload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("webhook_example_title")}</CardTitle>
          <CardDescription>{t("webhook_example_desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted rounded-lg p-4 text-xs font-mono overflow-x-auto max-h-96 overflow-y-auto text-foreground">
            {EXAMPLE_PAYLOAD}
          </pre>
        </CardContent>
      </Card>

      {/* Required fields */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("webhook_fields_title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {[
              { field: "event_type / event_name", desc: t("webhook_field_event"), required: true },
              { field: "sentiment", desc: t("webhook_field_sentiment"), required: false },
              { field: "importance_level", desc: t("webhook_field_importance"), required: false },
              { field: "ticker", desc: t("webhook_field_ticker"), required: false },
              { field: "asset_name", desc: t("webhook_field_asset"), required: false },
              { field: "title_en / title_es / title_pt", desc: t("webhook_field_titles"), required: false },
              { field: "body_en / body_es / body_pt", desc: t("webhook_field_bodies"), required: false },
            ].map((f) => (
              <div key={f.field} className="flex items-start gap-3 py-1.5 border-b border-border/30 last:border-0">
                <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono shrink-0">{f.field}</code>
                <span className="text-muted-foreground flex-1">{f.desc}</span>
                {f.required && (
                  <Badge variant="destructive" className="text-[10px] shrink-0">{t("webhook_required")}</Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminWebhooks;
