import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown, TrendingUp, Clock, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es, ptBR } from "date-fns/locale";
import Navbar from "@/components/landing/Navbar";
import { useNavigate } from "react-router-dom";

interface TradingSignal {
  id: string;
  pair: string;
  direction: "buy" | "sell";
  entry_price: number;
  take_profit: number | null;
  stop_loss: number | null;
  status: string;
  source: string;
  notes: string | null;
  created_at: string;
  closed_at: string | null;
}

const signalsTable = () => (supabase.from as any)("trading_signals");

const Signals = () => {
  const { user, loading: authLoading } = useAuth();
  const { lang, t } = useLanguage();
  const navigate = useNavigate();
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [loading, setLoading] = useState(true);

  const dateLocale = lang === "es" ? es : ptBR;

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

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("trading-signals-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trading_signals" },
        (payload: any) => {
          if (payload.eventType === "INSERT") {
            setSignals((prev) => [payload.new as TradingSignal, ...prev].slice(0, 50));
          } else if (payload.eventType === "UPDATE") {
            setSignals((prev) =>
              prev.map((s) => (s.id === payload.new.id ? (payload.new as TradingSignal) : s))
            );
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const statusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "hit_tp": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "hit_sl": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "closed": return "bg-muted text-muted-foreground border-border";
      case "expired": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      active: t("signals_status_active"),
      hit_tp: t("signals_status_hit_tp"),
      hit_sl: t("signals_status_hit_sl"),
      closed: t("signals_status_closed"),
      expired: t("signals_status_expired"),
    };
    return map[status] || status;
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
            <TrendingUp className="h-7 w-7 text-secondary" />
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
              <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-lg text-muted-foreground">{t("signals_empty")}</p>
              <p className="text-sm text-muted-foreground/70 mt-1">{t("signals_empty_desc")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {signals.map((signal) => (
              <Card key={signal.id} className="overflow-hidden border-border/50 hover:border-border transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      {signal.direction === "buy" ? (
                        <ArrowUp className="h-5 w-5 text-emerald-400" />
                      ) : (
                        <ArrowDown className="h-5 w-5 text-red-400" />
                      )}
                      {signal.pair}
                    </CardTitle>
                    <Badge className={`${statusColor(signal.status)} text-xs`}>
                      {statusLabel(signal.status)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(signal.created_at), { addSuffix: true, locale: dateLocale })}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                    signal.direction === "buy"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-red-500/20 text-red-400"
                  }`}>
                    {signal.direction === "buy" ? t("signals_buy") : t("signals_sell")}
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("signals_entry")}</p>
                      <p className="font-mono font-bold text-foreground">{signal.entry_price}</p>
                    </div>
                    <div className="bg-emerald-500/5 rounded-lg p-2.5 text-center">
                      <p className="text-[10px] text-emerald-400 uppercase tracking-wider">TP</p>
                      <p className="font-mono font-bold text-emerald-400">{signal.take_profit ?? "—"}</p>
                    </div>
                    <div className="bg-red-500/5 rounded-lg p-2.5 text-center">
                      <p className="text-[10px] text-red-400 uppercase tracking-wider">SL</p>
                      <p className="font-mono font-bold text-red-400">{signal.stop_loss ?? "—"}</p>
                    </div>
                  </div>

                  {signal.notes && (
                    <p className="text-xs text-muted-foreground bg-muted/20 rounded p-2">{signal.notes}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Signals;
