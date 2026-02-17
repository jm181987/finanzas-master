import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut, LayoutDashboard, Shield } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/logo.png";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();

  const navLinks = [
    { label: "Inicio", href: "#hero" },
    { label: "Cursos", href: "#cursos" },
    { label: "Categorías", href: "#categorias" },
    { label: "Testimonios", href: "#testimonios" },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
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
                <Link to="/dashboard">
                  <Button variant="ghost" className="text-primary-foreground/80 hover:text-gold hover:bg-navy-light/50 gap-2">
                    <LayoutDashboard className="h-4 w-4" /> Mi Panel
                  </Button>
                </Link>
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
  );
};

export default Navbar;
