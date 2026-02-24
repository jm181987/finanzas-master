import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, PiggyBank, CreditCard, BookOpen, Wrench, Brain } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";

const iconMap: Record<string, React.ElementType> = {
  TrendingUp, PiggyBank, CreditCard, GraduationCap: BookOpen, Wrench, Brain,
};

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  course_count: number;
}

const CategoriesSection = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const categoryDescriptions: Record<string, string> = {
    inversiones: t("cat_desc_inversiones"),
    ahorro: t("cat_desc_ahorro"),
    creditos: t("cat_desc_creditos"),
    "educacion-financiera": t("cat_desc_educacion"),
    herramientas: t("cat_desc_herramientas"),
    "mentalidad-del-dinero": t("cat_desc_mentalidad"),
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data: cats } = await supabase.from("categories").select("id, name, slug, description, icon").order("name");
        if (!cats) return;
        const { data: courses } = await supabase.from("courses").select("category_id").eq("is_published", true).eq("status", "approved");
        const countMap: Record<string, number> = {};
        for (const c of courses || []) {
          if (c.category_id) countMap[c.category_id] = (countMap[c.category_id] || 0) + 1;
        }
        setCategories(cats.map((cat) => ({ ...cat, course_count: countMap[cat.id] || 0 })));
      } catch (err) {
        console.error("Error fetching categories:", err);
      }
    };
    fetchCategories();
  }, []);

  return (
    <section id="categorias" className="py-12 sm:py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10 sm:mb-14">
          <span className="text-sm font-semibold text-secondary uppercase tracking-wider">{t("cat_badge")}</span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-foreground mt-3">
            {t("cat_title_1")}{" "}
            <span className="text-secondary">{t("cat_title_2")}</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {categories.map((cat, i) => {
            const Icon = iconMap[cat.icon || ""] || BookOpen;
            const description = cat.description || categoryDescriptions[cat.slug] || t("cat_desc_default");
            return (
              <motion.div key={cat.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                onClick={() => navigate(`/courses?category=${cat.id}`)}
                className="group p-6 rounded-2xl border border-border bg-card hover:border-secondary/40 hover:shadow-lg hover:shadow-secondary/5 transition-all duration-300 cursor-pointer"
              >
                <div className="h-12 w-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-4 group-hover:bg-secondary/20 transition-colors">
                  <Icon className="h-6 w-6 text-secondary" />
                </div>
                <h3 className="text-lg font-semibold text-card-foreground mb-2">{cat.name}</h3>
                <p className="text-sm text-muted-foreground mb-3">{description}</p>
                <span className="text-xs font-medium text-secondary">
                  {cat.course_count} {cat.course_count === 1 ? t("cat_course") : t("cat_courses")}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
