import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Mail, Lock, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

const Register = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { toast.error(t("register_error_mismatch")); return; }
    if (password.length < 6) { toast.error(t("register_error_short")); return; }
    setIsLoading(true);
    const { error } = await signUp(email, password, fullName);
    if (error) { toast.error(error.message); }
    else {
      toast.success(t("register_success"));
      navigate(`/login${searchParams.get("redirect") ? `?redirect=${searchParams.get("redirect")}` : ""}`);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex flex-1 bg-navy items-center justify-center p-12">
        <div className="max-w-md text-center">
          <img src={logo} alt="FinanzasMaster" className="h-20 w-auto mx-auto mb-6 brightness-0 invert" />
          <h2 className="text-3xl font-display font-bold text-primary-foreground mb-4">
            {t("register_hero_title_1")} <span className="text-gold">FinanzasMaster</span>
          </h2>
          <p className="text-primary-foreground/60">{t("register_hero_desc")}</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center mb-8">
            <img src={logo} alt="FinanzasMaster" className="h-12 w-auto" />
          </Link>

          <h1 className="text-3xl font-display font-bold text-foreground mb-2">{t("register_title")}</h1>
          <p className="text-muted-foreground mb-8">{t("register_subtitle")}</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="fullName">{t("register_name")}</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="fullName" type="text" placeholder={t("register_name_placeholder")} className="pl-10" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t("register_email")}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="tu@email.com" className="pl-10" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("register_password")}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="password" type={showPassword ? "text" : "password"} placeholder={t("register_password_placeholder")} className="pl-10 pr-10" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t("register_confirm")}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="confirmPassword" type={showPassword ? "text" : "password"} placeholder={t("register_confirm_placeholder")} className="pl-10" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              </div>
            </div>

            <Button type="submit" className="w-full bg-gold text-navy-dark hover:bg-gold-dark font-semibold" disabled={isLoading}>
              {isLoading ? t("register_loading") : t("register_submit")}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {t("register_has_account")}{" "}
            <Link to={`/login${searchParams.get("redirect") ? `?redirect=${searchParams.get("redirect")}` : ""}`} className="text-gold font-medium hover:underline">
              {t("register_login_link")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
