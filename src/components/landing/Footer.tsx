import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

const Footer = () => {
  return (
    <footer className="bg-navy-dark border-t border-navy-light/20 py-12">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center mb-4">
              <img src={logo} alt="FinanzasMaster" className="h-10 w-auto brightness-0 invert" />
            </Link>
            <p className="text-sm text-primary-foreground/50 leading-relaxed">
              La plataforma líder en educación financiera en español. Aprende, invierte y transforma tu futuro.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-semibold text-primary-foreground mb-4">Plataforma</h4>
            <ul className="space-y-2">
              {["Cursos", "Categorías", "Instructores", "Precios"].map((l) => (
                <li key={l}>
                  <a href="#" className="text-sm text-primary-foreground/50 hover:text-gold transition-colors">{l}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-primary-foreground mb-4">Compañía</h4>
            <ul className="space-y-2">
              {["Sobre Nosotros", "Blog", "Contacto", "Soporte"].map((l) => (
                <li key={l}>
                  <a href="#" className="text-sm text-primary-foreground/50 hover:text-gold transition-colors">{l}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-primary-foreground mb-4">Legal</h4>
            <ul className="space-y-2">
              {["Términos de Uso", "Privacidad", "Cookies"].map((l) => (
                <li key={l}>
                  <a href="#" className="text-sm text-primary-foreground/50 hover:text-gold transition-colors">{l}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-navy-light/20 pt-6 text-center">
          <p className="text-xs text-primary-foreground/40">
            © {new Date().getFullYear()} FinanzasMaster. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
