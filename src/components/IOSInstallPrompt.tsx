import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

const IOSInstallPrompt = ({ onClose }: { onClose: () => void }) => {
  const { t } = useLanguage();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-background border border-border rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-5">
          <Download className="h-5 w-5 text-secondary" />
          <h2 className="text-lg font-semibold text-foreground">{t("pwa_ios_title")}</h2>
        </div>
        <ol className="space-y-4 text-sm text-foreground">
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-secondary/20 text-secondary flex items-center justify-center font-bold text-xs">1</span>
            <div>
              <p className="font-medium">{t("pwa_ios_step1")}</p>
              <p className="text-muted-foreground text-xs mt-0.5">{t("pwa_ios_share_icon")} <span className="inline-block text-base leading-none align-middle">⬆</span></p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-secondary/20 text-secondary flex items-center justify-center font-bold text-xs">2</span>
            <p className="font-medium">{t("pwa_ios_step2")}</p>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-secondary/20 text-secondary flex items-center justify-center font-bold text-xs">3</span>
            <p className="font-medium">{t("pwa_ios_step3")}</p>
          </li>
        </ol>
        <Button className="w-full mt-6" onClick={onClose}>{t("pwa_ios_close")}</Button>
      </div>
    </div>
  );
};

export default IOSInstallPrompt;
