import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";
import { useLanguage } from "@/i18n/LanguageContext";

const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-navy-dark border-t border-navy-light/20 py-10 sm:py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-8 sm:mb-10">
          <div className="col-span-2 sm:col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center mb-4">
              <img src={logo} alt="FinanzasMaster" className="h-10 w-auto brightness-0 invert" />
            </Link>
            <p className="text-sm text-primary-foreground/50 leading-relaxed">{t("footer_desc")}</p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-primary-foreground mb-4">{t("footer_platform")}</h4>
            <ul className="space-y-2">
              {[t("footer_courses"), t("footer_categories"), t("footer_instructors"), t("footer_pricing")].map((l) => (
                <li key={l}><a href="#" className="text-sm text-primary-foreground/50 hover:text-gold transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-primary-foreground mb-4">{t("footer_company")}</h4>
            <ul className="space-y-2">
              {[t("footer_about"), t("footer_blog"), t("footer_contact"), t("footer_support")].map((l) => (
                <li key={l}><a href="#" className="text-sm text-primary-foreground/50 hover:text-gold transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-primary-foreground mb-4">{t("footer_legal")}</h4>
            <ul className="space-y-2">
              {[t("footer_terms"), t("footer_privacy"), t("footer_cookies")].map((l) => (
                <li key={l}><a href="#" className="text-sm text-primary-foreground/50 hover:text-gold transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-navy-light/20 pt-6 text-center">
          <p className="text-xs text-primary-foreground/40">
            © {new Date().getFullYear()} FinanzasMaster. {t("footer_rights")}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
