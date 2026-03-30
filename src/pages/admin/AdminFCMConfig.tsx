import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Smartphone, Save, CheckCircle, AlertCircle, Eye, EyeOff, Shield, Send } from "lucide-react";
import { toast } from "sonner";

const AdminFCMConfig = () => {
  const { t } = useLanguage();
  const { session, loading: authLoading } = useAuth();
  const [fcmJson, setFcmJson] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [testingSend, setTestingSend] = useState(false);
  const [parsedInfo, setParsedInfo] = useState<{ project_id?: string; client_email?: string } | null>(null);

  const loadConfig = useCallback(async () => {
    if (authLoading) return;
    if (!session?.access_token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-settings", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { action: "get", key: "fcm_service_account" },
      });

      if (error) throw error;

      const value = data?.value ?? "";
      setFcmJson(value);
      setIsConfigured(Boolean(value));

      if (value) {
        try {
          const parsed = JSON.parse(value);
          setParsedInfo({ project_id: parsed.project_id, client_email: parsed.client_email });
        } catch {
          setParsedInfo(null);
        }
      } else {
        setParsedInfo(null);
      }
    } catch (e) {
      console.error("Error loading FCM config:", e);
      toast.error("Error loading FCM configuration");
    } finally {
      setLoading(false);
    }
  }, [authLoading, session?.access_token]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const validateJson = (json: string): boolean => {
    try {
      const parsed = JSON.parse(json);
      if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
        toast.error(t("fcm_error_missing_fields"));
        return false;
      }
      return true;
    } catch {
      toast.error(t("fcm_error_invalid_json"));
      return false;
    }
  };

  const handleSave = async () => {
    if (!session?.access_token) {
      toast.error("Authentication required");
      return;
    }
    if (!fcmJson.trim()) {
      toast.error(t("fcm_error_empty"));
      return;
    }
    if (!validateJson(fcmJson.trim())) return;

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-settings", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { action: "set", key: "fcm_service_account", value: fcmJson.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const parsed = JSON.parse(fcmJson.trim());
      setParsedInfo({ project_id: parsed.project_id, client_email: parsed.client_email });
      setIsConfigured(true);
      toast.success(t("fcm_saved"));
    } catch (e: any) {
      toast.error("Error: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestPush = async () => {
    if (!session?.access_token) {
      toast.error("Authentication required");
      return;
    }
    if (!isConfigured) {
      toast.error(t("fcm_status_inactive"));
      return;
    }
    setTestingSend(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-push", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          title: "🔔 Push de prueba",
          body: "Si ves esta notificación en tu celular, ¡FCM está funcionando correctamente!",
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.sent > 0) {
        toast.success(`Push enviado a ${data.sent} dispositivo(s)`);
      } else {
        toast.info(data?.message || "No hay dispositivos registrados aún");
      }
    } catch (e: any) {
      toast.error("Error: " + e.message);
    } finally {
      setTestingSend(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Smartphone className="h-6 w-6 text-secondary" />
        <h1 className="text-2xl font-bold text-foreground">{t("fcm_page_title")}</h1>
      </div>

      {/* Status card */}
      <Card className={isConfigured ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5"}>
        <CardContent className="flex items-center gap-3 py-4">
          {isConfigured ? (
            <>
              <CheckCircle className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">{t("fcm_status_active")}</p>
                {parsedInfo && (
                  <p className="text-xs text-muted-foreground">
                    Project: {parsedInfo.project_id} • {parsedInfo.client_email}
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-sm font-medium text-foreground">{t("fcm_status_inactive")}</p>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Config form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-secondary" />
              {t("fcm_config_title")}
            </CardTitle>
            <CardDescription>{t("fcm_config_desc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>{t("fcm_json_label")}</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowJson(!showJson)}
                  className="h-7 text-xs"
                >
                  {showJson ? <EyeOff className="h-3.5 w-3.5 mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
                  {showJson ? t("fcm_hide") : t("fcm_show")}
                </Button>
              </div>
              {showJson ? (
                <Textarea
                  value={fcmJson}
                  onChange={(e) => setFcmJson(e.target.value)}
                  placeholder={t("fcm_json_placeholder")}
                  rows={12}
                  className="font-mono text-xs"
                />
              ) : (
                <div className="rounded-md border border-input bg-muted/30 p-4 min-h-[200px] flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">{isConfigured ? t("fcm_hidden_configured") : t("fcm_hidden_empty")}</p>
                </div>
              )}
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              {saving ? t("fcm_saving") : t("fcm_save")}
            </Button>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("fcm_instructions_title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <ol className="list-decimal list-inside space-y-3">
              <li>{t("fcm_step_1")}</li>
              <li>{t("fcm_step_2")}</li>
              <li>{t("fcm_step_3")}</li>
              <li>{t("fcm_step_4")}</li>
              <li>{t("fcm_step_5")}</li>
            </ol>
            <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border/50">
              <p className="text-xs font-medium text-foreground mb-1">{t("fcm_json_example_title")}</p>
              <pre className="text-[10px] text-muted-foreground overflow-x-auto whitespace-pre">
{`{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n",
  "client_email": "firebase-adminsdk-...@your-project.iam.gserviceaccount.com",
  "client_id": "...",
  ...
}`}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminFCMConfig;
