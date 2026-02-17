import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut, LayoutDashboard, Shield, KeyRound, ChevronDown } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/logo.png";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [showPwdModal, setShowPwdModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isLanding = location.pathname === "/";

  const navLinks = isLanding
    ? [
        { label: "Inicio", href: "#hero" },
        { label: "Cursos", href: "#cursos" },
        { label: "Categorías", href: "#categorias" },
        { label: "Testimonios", href: "#testimonios" },
      ]
    : [{ label: "Inicio", href: "/" }];

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setPanelOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-navy/95 backdrop-blur-md border-b border-navy-light/30">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <Link to="/" className="flex items-center">
              <div className="relative flex items-center">
                <div className="absolute inset-0 rounded-full blur-xl opacity-60" style={{ background: "radial-gradient(ellipse, hsl(var(--gold)) 0%, transparent 70%)", transform: "scale(1.8)" }} />
                <img src={logo} alt="FinanzasMaster" className="relative h-10 lg:h-12 w-auto drop-shadow-[0_0_12px_hsl(var(--gold)/0.8)]" />
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-sm font-medium text-primary-foreground/70 hover:text-gold transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <>
                  {role === "admin" && (
                    <Link to="/admin">
                      <Button variant="ghost" className="text-primary-foreground/80 hover:text-gold hover:bg-navy-light/50 gap-2">
                        <Shield className="h-4 w-4" /> Admin
                      </Button>
                    </Link>
                  )}

                  {/* Mi Panel dropdown */}
                  <div className="relative" ref={dropdownRef}>
                    <Button
                      variant="ghost"
                      className="text-primary-foreground/80 hover:text-gold hover:bg-navy-light/50 gap-2"
                      onClick={() => setPanelOpen((v) => !v)}
                    >
                      <LayoutDashboard className="h-4 w-4" /> Mi Panel
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${panelOpen ? "rotate-180" : ""}`} />
                    </Button>

                    {panelOpen && (
                      <div className="absolute right-0 top-full mt-2 w-52 bg-background border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                        <Link
                          to="/dashboard"
                          onClick={() => setPanelOpen(false)}
                          className="flex items-center gap-2 px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors"
                        >
                          <LayoutDashboard className="h-4 w-4 text-secondary" /> Ir a mi panel
                        </Link>
                        <button
                          onClick={() => { setPanelOpen(false); setShowPwdModal(true); }}
                          className="w-full flex items-center gap-2 px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors"
                        >
                          <KeyRound className="h-4 w-4 text-secondary" /> Cambiar contraseña
                        </button>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleSignOut}
                    variant="ghost"
                    className="text-primary-foreground/80 hover:text-gold hover:bg-navy-light/50 gap-2"
                  >
                    <LogOut className="h-4 w-4" /> Salir
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="ghost" className="text-primary-foreground/80 hover:text-gold hover:bg-navy-light/50">
                      Iniciar Sesión
                    </Button>
                  </Link>
                  <Link to="/register">
                    <Button className="bg-gold text-navy-dark hover:bg-gold-dark font-semibold">
                      Registrarse
                    </Button>
                  </Link>
                </>
              )}
            </div>

            <button
              className="md:hidden text-primary-foreground"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-navy border-t border-navy-light/30"
            >
              <div className="container mx-auto px-4 py-4 flex flex-col gap-3">
                {navLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="text-sm font-medium text-primary-foreground/70 hover:text-gold py-2"
                  >
                    {link.label}
                  </a>
                ))}
                <div className="flex flex-col gap-2 pt-3 border-t border-navy-light/30">
                  {user ? (
                    <>
                      {role === "admin" && (
                        <Link to="/admin" onClick={() => setIsOpen(false)}>
                          <Button variant="ghost" className="w-full text-primary-foreground/80 hover:text-gold gap-2">
                            <Shield className="h-4 w-4" /> Admin
                          </Button>
                        </Link>
                      )}
                      <Link to="/dashboard" onClick={() => setIsOpen(false)}>
                        <Button variant="ghost" className="w-full text-primary-foreground/80 hover:text-gold gap-2">
                          <LayoutDashboard className="h-4 w-4" /> Mi Panel
                        </Button>
                      </Link>
                      <button
                        onClick={() => { setIsOpen(false); setShowPwdModal(true); }}
                        className="flex items-center justify-center gap-2 w-full py-2 text-sm text-primary-foreground/80 hover:text-gold transition-colors"
                      >
                        <KeyRound className="h-4 w-4" /> Cambiar contraseña
                      </button>
                      <Button
                        onClick={() => { handleSignOut(); setIsOpen(false); }}
                        variant="ghost"
                        className="w-full text-primary-foreground/80 hover:text-gold gap-2"
                      >
                        <LogOut className="h-4 w-4" /> Salir
                      </Button>
                    </>
                  ) : (
                    <>
                      <Link to="/login" onClick={() => setIsOpen(false)}>
                        <Button variant="ghost" className="w-full text-primary-foreground/80 hover:text-gold">
                          Iniciar Sesión
                        </Button>
                      </Link>
                      <Link to="/register" onClick={() => setIsOpen(false)}>
                        <Button className="w-full bg-gold text-navy-dark hover:bg-gold-dark font-semibold">
                          Registrarse
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Password modal */}
      {showPwdModal && <PasswordModal onClose={() => setShowPwdModal(false)} />}
    </>
  );
};

/* ── Password change modal ── */
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PasswordModal = ({ onClose }: { onClose: () => void }) => {
  const [newPwd, setNewPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!newPwd || !confirm) { toast.error("Completa ambos campos"); return; }
    if (newPwd.length < 6) { toast.error("Mínimo 6 caracteres"); return; }
    if (newPwd !== confirm) { toast.error("Las contraseñas no coinciden"); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    setSaving(false);
    if (error) { toast.error("Error: " + error.message); return; }
    toast.success("Contraseña actualizada");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-background border border-border rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-5">
          <KeyRound className="h-5 w-5 text-secondary" />
          <h2 className="text-lg font-semibold text-foreground">Cambiar contraseña</h2>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nueva contraseña</Label>
            <div className="relative">
              <Input type={showNew ? "text" : "password"} value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="••••••••" className="pr-10" />
              <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Confirmar contraseña</Label>
            <div className="relative">
              <Input type={showConfirm ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" className="pr-10" />
              <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>{saving ? "Guardando..." : "Actualizar"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
