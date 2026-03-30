import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { ArrowUp, ArrowDown, TrendingUp, ChevronRight, ChevronLeft, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es, ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

interface TradingSignal {
  id: string;
  pair: string;
  direction: "buy" | "sell";
  entry_price: number;
  take_profit: number | null;
  stop_loss: number | null;
  status: string;
  created_at: string;
}

const signalsTable = () => (supabase.from as any)("trading_signals");

const SignalsTicker = () => {
  const { user } = useAuth();
  const { lang, t } = useLanguage();
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [open, setOpen] = useState(false);

  const dateLocale = lang === "es" ? es : ptBR;

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await signalsTable()
        .select("id, pair, direction, entry_price, take_profit, stop_loss, status, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      if (data) setSignals(data);
    };
    load();

    const channel = supabase
      .channel("signals-ticker")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "trading_signals" },
        (payload: any) => {
          setSignals((prev) => [payload.new as TradingSignal, ...prev].slice(0, 10));
          // Auto-open on new signal
          setOpen(true);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  if (!user || signals.length === 0) return null;

  return (
    <>
      {/* Floating toggle button */}
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
            <TrendingUp className="h-4 w-4 text-secondary" />
            {signals.some((s) => s.status === "active") && (
              <span className="absolute -top-1 -left-1 h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            )}
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
            className="fixed right-0 top-0 h-full w-72 z-40 bg-background/98 backdrop-blur-md border-l border-border/40 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-20 pb-3 border-b border-border/30">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-secondary" />
                <span className="text-sm font-semibold text-foreground">{t("signals_title")}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-medium animate-pulse">
                  {t("signals_live")}
                </span>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted/50">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Signals list */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 scrollbar-thin">
              {signals.map((signal, i) => (
                <motion.div
                  key={signal.id}
                  initial={i === 0 ? { opacity: 0, y: -10 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-lg border p-3 transition-colors ${
                    signal.status === "active"
                      ? "border-border/50 bg-muted/20"
                      : "border-border/20 bg-muted/5 opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      {signal.direction === "buy" ? (
                        <ArrowUp className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5 text-red-400" />
                      )}
                      <span className="text-sm font-bold text-foreground">{signal.pair}</span>
                    </div>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      signal.direction === "buy"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-red-500/15 text-red-400"
                    }`}>
                      {signal.direction === "buy" ? (lang === "pt" ? "COMPRA" : "COMPRA") : (lang === "pt" ? "VENDA" : "VENTA")}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                    <div className="text-center">
                      <p className="text-muted-foreground/70 uppercase tracking-wider" style={{ fontSize: "9px" }}>{t("signals_entry")}</p>
                      <p className="font-mono font-bold text-foreground">{signal.entry_price}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-emerald-400/70 uppercase tracking-wider" style={{ fontSize: "9px" }}>TP</p>
                      <p className="font-mono font-bold text-emerald-400">{signal.take_profit ?? "—"}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-red-400/70 uppercase tracking-wider" style={{ fontSize: "9px" }}>SL</p>
                      <p className="font-mono font-bold text-red-400">{signal.stop_loss ?? "—"}</p>
                    </div>
                  </div>

                  <p className="text-[10px] text-muted-foreground/50 mt-1.5">
                    {formatDistanceToNow(new Date(signal.created_at), { addSuffix: true, locale: dateLocale })}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Footer link */}
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
