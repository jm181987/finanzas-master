import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Webhook, Send, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const WEBHOOK_URL = `https://tnjcigqqmwahnxcsljgk.supabase.co/functions/v1/receive-signal`;

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

const AdminWebhooks = () => {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);

  const copyUrl = async () => {
    await navigator.clipboard.writeText(WEBHOOK_URL);
    setCopied(true);
    toast.success(t("webhook_copied"));
    setTimeout(() => setCopied(false), 2000);
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
      } else {
        toast.error(t("webhook_test_error") + ": " + (data.error || "Unknown"));
      }
    } catch (e) {
      toast.error(t("webhook_test_error"));
    } finally {
      setTesting(false);
    }
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
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 shrink-0">
              POST
            </Badge>
            <Input value={WEBHOOK_URL} readOnly className="font-mono text-sm" />
            <Button variant="outline" size="icon" onClick={copyUrl}>
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test */}
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
