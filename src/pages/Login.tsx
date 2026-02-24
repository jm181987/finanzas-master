import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  useEffect(() => {
    if (user) navigate(redirectTo, { replace: true });
  }, [user, navigate, redirectTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? t("login_error") : error.message);
    } else {
      toast.success(t("login_success"));
      navigate(redirectTo, { replace: true });
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center mb-8">
            <img src={logo} alt="FinanzasMaster" className="h-12 w-auto" />
          </Link>

          <h1 className="text-3xl font-display font-bold text-foreground mb-2">{t("login_title")}</h1>
          <p className="text-muted-foreground mb-8">{t("login_subtitle")}</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">{t("login_email")}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="tu@email.com" className="pl-10" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("login_password")}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" className="pl-10 pr-10" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full bg-gold text-navy-dark hover:bg-gold-dark font-semibold" disabled={isLoading}>
              {isLoading ? t("login_loading") : t("login_submit")}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {t("login_no_account")}{" "}
            <Link to={`/register${searchParams.get("redirect") ? `?redirect=${searchParams.get("redirect")}` : ""}`} className="text-gold font-medium hover:underline">
              {t("login_register_link")}
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 bg-navy items-center justify-center p-12">
        <div className="max-w-md text-center">
          <img src={logo} alt="FinanzasMaster" className="h-20 w-auto mx-auto mb-6 brightness-0 invert" />
          <h2 className="text-3xl font-display font-bold text-primary-foreground mb-4">
            {t("login_hero_title_1")} <span className="text-gold">{t("login_hero_title_2")}</span>
          </h2>
          <p className="text-primary-foreground/60">{t("login_hero_desc")}</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
