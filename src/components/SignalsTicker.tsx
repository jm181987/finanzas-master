import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { TrendingUp, TrendingDown, Activity, ChevronRight, ChevronLeft, Star } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es, ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

interface TradingSignal {
  id: string;
  event_id: string;
  sentiment: string | null;
  importance_level: number | null;
  asset_name: string | null;
  ticker: string | null;
  event_type: string | null;
  title_en: string | null;
  title_es: string | null;
  title_pt: string | null;
  body_en: string | null;
  body_es: string | null;
  body_pt: string | null;
  created_at: string;
}

const signalsTable = () => (supabase.from as any)("trading_signals");

const SignalsTicker = () => {
  const { user } = useAuth();
  const { lang, t } = useLanguage();
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [open, setOpen] = useState(false);

  const dateLocale = lang === "es" ? es : ptBR;

  const getTitle = (s: TradingSignal) => {
    if (lang === "pt" && s.title_pt) return s.title_pt;
    if (lang === "es" && s.title_es) return s.title_es;
    return s.title_en || s.event_type || "Signal";
  };

  const getBody = (s: TradingSignal) => {
    if (lang === "pt" && s.body_pt) return s.body_pt;
    if (lang === "es" && s.body_es) return s.body_es;
    return s.body_en || "";
  };

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await signalsTable()
        .select("id, event_id, sentiment, importance_level, asset_name, ticker, event_type, title_en, title_es, title_pt, body_en, body_es, body_pt, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      if (data) setSignals(data);
    };
    load();

    const channel = supabase
      .channel("signals-ticker")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "trading_signals" }, (payload: any) => {
        setSignals((prev) => [payload.new as TradingSignal, ...prev].slice(0, 10));
        setOpen(true);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  if (!user || signals.length === 0) return null;

  const sentimentIcon = (sentiment: string | null) => {
    switch (sentiment?.toLowerCase()) {
      case "positive": return <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />;
      case "negative": return <TrendingDown className="h-3.5 w-3.5 text-red-400" />;
      default: return <Activity className="h-3.5 w-3.5 text-yellow-400" />;
    }
  };

  const sentimentBg = (sentiment: string | null) => {
    switch (sentiment?.toLowerCase()) {
      case "positive": return "border-emerald-500/20";
      case "negative": return "border-red-500/20";
      default: return "border-yellow-500/20";
    }
  };

  return (
    <>
      {/* Floating toggle */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            onClick={() => setOpen(true)}
            className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex items-center gap-1.5 bg-background/95 backdrop-blur border border-border/50 rounded-l-xl px-2 py-3 shadow-lg hover:bg-muted/50 transition-colors group"
          >
            <ChevronLeft className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            <Activity className="h-4 w-4 text-secondary" />
            <span className="absolute -top-1 -left-1 h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Sidebar panel */}
      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-80 z-40 bg-white backdrop-blur-md border-l border-border/40 shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between px-4 pt-20 pb-3 border-b border-border/30">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-secondary" />
                <span className="text-sm font-semibold text-gray-900">{t("signals_title")}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-medium animate-pulse">
                  {t("signals_live")}
                </span>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted/50">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
              {signals.map((signal, i) => (
                <motion.div
                  key={signal.id}
                  initial={i === 0 ? { opacity: 0, y: -10 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-lg border p-3 bg-white shadow-sm ${sentimentBg(signal.sentiment)}`}
                >
                  <div className="flex items-start gap-2 mb-1">
                    <div className="mt-0.5">{sentimentIcon(signal.sentiment)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground leading-tight line-clamp-2">
                        {getTitle(signal)}
                      </p>
                      {(signal.asset_name || signal.ticker) && (
                        <p className="text-[11px] text-secondary font-medium mt-0.5">
                          {signal.ticker && <span className="font-mono">{signal.ticker} </span>}
                          {signal.asset_name}
                        </p>
                      )}
                    </div>
                    {signal.importance_level && signal.importance_level >= 3 && (
                      <Star className="h-3 w-3 fill-secondary text-secondary shrink-0 mt-0.5" />
                    )}
                  </div>

                  <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                    {getBody(signal)}
                  </p>

                  <p className="text-[10px] text-muted-foreground/50 mt-1.5">
                    {formatDistanceToNow(new Date(signal.created_at), { addSuffix: true, locale: dateLocale })}
                  </p>
                </motion.div>
              ))}
            </div>

            <div className="px-3 py-3 border-t border-border/30">
              <Link
                to="/signals"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-1.5 text-xs font-medium text-secondary hover:text-secondary/80 transition-colors"
              >
                {lang === "es" ? "Ver todas las señales" : "Ver todos os sinais"}
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};

export default SignalsTicker;
