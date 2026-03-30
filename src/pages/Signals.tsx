import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Activity, Clock, RefreshCw, AlertTriangle, Star } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es, ptBR } from "date-fns/locale";
import Navbar from "@/components/landing/Navbar";
import { useNavigate } from "react-router-dom";

interface TradingSignal {
  id: string;
  event_id: string;
  source: string;
  event_name: string | null;
  event_type: string | null;
  event_date_utc: string | null;
  sentiment: string | null;
  importance_level: number | null;
  ticker: string | null;
  asset_name: string | null;
  asset_name_short: string | null;
  asset_type: string | null;
  currency: string | null;
  asset_trigger_price: number | null;
  asset_threshold_price: number | null;
  asset_change_percent: number | null;
  title_en: string | null;
  title_es: string | null;
  title_pt: string | null;
  body_en: string | null;
  body_es: string | null;
  body_pt: string | null;
  has_reasoning: boolean;
  reasoning: string | null;
  created_at: string;
}

const signalsTable = () => (supabase.from as any)("trading_signals");

const Signals = () => {
  const { user, loading: authLoading } = useAuth();
  const { lang, t } = useLanguage();
  const navigate = useNavigate();
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [loading, setLoading] = useState(true);

  const dateLocale = lang === "es" ? es : ptBR;

  const getTitle = (s: TradingSignal) => {
    if (lang === "pt" && s.title_pt) return s.title_pt;
    if (lang === "es" && s.title_es) return s.title_es;
    return s.title_en || s.event_type || s.event_name || "Signal";
  };

  const getBody = (s: TradingSignal) => {
    if (lang === "pt" && s.body_pt) return s.body_pt;
    if (lang === "es" && s.body_es) return s.body_es;
    return s.body_en || "";
  };

  const loadSignals = async () => {
    setLoading(true);
    const { data, error } = await signalsTable()
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setSignals(data);
    if (error) console.error("Error loading signals:", error);
    setLoading(false);
  };

  useEffect(() => {
    if (!user && !authLoading) {
      navigate("/login");
      return;
    }
    if (user) loadSignals();
  }, [user, authLoading]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("trading-signals-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "trading_signals" }, (payload: any) => {
        if (payload.eventType === "INSERT") {
          setSignals((prev) => [payload.new as TradingSignal, ...prev].slice(0, 50));
        } else if (payload.eventType === "UPDATE") {
          setSignals((prev) => prev.map((s) => (s.id === payload.new.id ? (payload.new as TradingSignal) : s)));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const sentimentConfig = (sentiment: string | null) => {
    switch (sentiment?.toLowerCase()) {
      case "positive": return { icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/15", label: lang === "pt" ? "Positivo" : "Positivo" };
      case "negative": return { icon: TrendingDown, color: "text-red-400", bg: "bg-red-500/15", label: lang === "pt" ? "Negativo" : "Negativo" };
      default: return { icon: Activity, color: "text-yellow-400", bg: "bg-yellow-500/15", label: "Neutral" };
    }
  };

  const importanceStars = (level: number | null) => {
    if (!level) return null;
    return Array.from({ length: Math.min(level, 5) }, (_, i) => (
      <Star key={i} className="h-3 w-3 fill-secondary text-secondary" />
    ));
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Activity className="h-7 w-7 text-secondary" />
            <h1 className="text-3xl font-bold text-foreground">{t("signals_title")}</h1>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 animate-pulse">
              {t("signals_live")}
            </Badge>
          </div>
          <Button variant="outline" size="sm" onClick={loadSignals} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            {t("signals_refresh")}
          </Button>
        </div>

        {signals.length === 0 && !loading ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <Activity className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-lg text-muted-foreground">{t("signals_empty")}</p>
              <p className="text-sm text-muted-foreground/70 mt-1">{t("signals_empty_desc")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {signals.map((signal) => {
              const sc = sentimentConfig(signal.sentiment);
              const SentimentIcon = sc.icon;
              return (
                <Card key={signal.id} className="overflow-hidden border-border/50 hover:border-border transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base font-bold flex items-center gap-2 leading-tight">
                        <SentimentIcon className={`h-5 w-5 shrink-0 ${sc.color}`} />
                        <span className="line-clamp-2">{getTitle(signal)}</span>
                      </CardTitle>
                      <Badge className={`${sc.bg} ${sc.color} border-0 text-[10px] shrink-0`}>
                        {sc.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(signal.created_at), { addSuffix: true, locale: dateLocale })}
                      </div>
                      {signal.importance_level && (
                        <div className="flex items-center gap-0.5">
                          {importanceStars(signal.importance_level)}
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Asset info */}
                    {((signal.asset_name && signal.asset_name.toUpperCase() !== "UNKNOWN") || (signal.ticker && signal.ticker.toUpperCase() !== "UNKNOWN")) && (
                      <div className="flex items-center gap-2">
                        {signal.ticker && signal.ticker.toUpperCase() !== "UNKNOWN" && (
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-secondary/15 text-secondary">
                            {signal.ticker}
                          </span>
                        )}
                        {signal.asset_name && signal.asset_name.toUpperCase() !== "UNKNOWN" && (
                          <span className="text-sm font-medium text-foreground">{signal.asset_name}</span>
                        )}
                      </div>
                    )}

                    {/* Price data */}
                    {(signal.asset_trigger_price || signal.asset_threshold_price || signal.asset_change_percent) && (
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        {signal.asset_trigger_price != null && (
                          <div className="bg-muted/30 rounded-lg p-2 text-center">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{lang === "pt" ? "Preço" : "Precio"}</p>
                            <p className="font-mono font-bold text-foreground">{signal.asset_trigger_price}</p>
                          </div>
                        )}
                        {signal.asset_threshold_price != null && (
                          <div className="bg-muted/30 rounded-lg p-2 text-center">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Threshold</p>
                            <p className="font-mono font-bold text-foreground">{signal.asset_threshold_price}</p>
                          </div>
                        )}
                        {signal.asset_change_percent != null && (
                          <div className={`rounded-lg p-2 text-center ${signal.asset_change_percent >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">%</p>
                            <p className={`font-mono font-bold ${signal.asset_change_percent >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {signal.asset_change_percent > 0 ? "+" : ""}{signal.asset_change_percent}%
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Body */}
                    <p className="text-sm text-muted-foreground leading-relaxed">{getBody(signal)}</p>

                    {/* Meta */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {signal.event_type && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                          {signal.event_type}
                        </span>
                      )}
                      {signal.source && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground/70">
                          {signal.source}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Signals;
