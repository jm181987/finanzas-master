import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, BookOpen, Star, Users, Clock, Play, SlidersHorizontal, X, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { useLanguage } from "@/i18n/LanguageContext";
import { localized } from "@/lib/localized";
import { useAuth } from "@/hooks/useAuth";

interface Course {
  id: string; title: string; title_pt: string | null; short_description: string | null; short_description_pt: string | null; image_url: string | null;
  is_free: boolean; price: number; average_rating: number; total_students: number;
  is_featured: boolean; author_name: string; author_id: string; category_name: string; category_name_pt: string | null; category_id: string | null; lesson_count: number;
}

interface Category { id: string; name: string; name_pt: string | null; slug: string; }

const Courses = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "");
  const [priceFilter, setPriceFilter] = useState<"all" | "free" | "paid">("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [instructorAuthorIds, setInstructorAuthorIds] = useState<Set<string>>(new Set());
  const { t, lang } = useLanguage();
  const { role } = useAuth();

  useEffect(() => { fetchData(); }, []);
  useEffect(() => {
    setSelectedCategory(searchParams.get("category") || "");
    setSearch(searchParams.get("search") || "");
  }, [searchParams]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: cats } = await supabase.from("categories").select("id, name, name_pt, slug").order("name") as { data: any[] | null };
      setCategories((cats || []).map((c: any) => ({ id: c.id, name: c.name, name_pt: c.name_pt || null, slug: c.slug })));

      const { data, error } = await supabase.from("courses")
        .select("id, title, title_pt, short_description, short_description_pt, image_url, is_free, price, average_rating, total_students, is_featured, author_id, category_id, categories(name, name_pt)")
        .eq("is_published", true).eq("status", "approved").order("is_featured", { ascending: false });
      if (error) throw error;
      const rawRows = data as any[];

      const authorIds = [...new Set(rawRows.map((c: any) => c.author_id))];
      let authorMap: Record<string, string> = {};
      if (authorIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", authorIds);
        for (const p of profiles || []) authorMap[p.id] = p.full_name || "Instructor";
      }

      const courseIds = rawRows.map((c: any) => c.id);
      let lessonCounts: Record<string, number> = {};
      if (courseIds.length > 0) {
        const { data: modules } = await supabase.from("modules").select("id, course_id").in("course_id", courseIds);
        const moduleIds = (modules || []).map((m) => m.id);
        const moduleMap = new Map((modules || []).map((m) => [m.id, m.course_id]));
        if (moduleIds.length > 0) {
          const { data: lessons } = await supabase.from("lessons").select("module_id").in("module_id", moduleIds);
          for (const l of lessons || []) {
            const cid = moduleMap.get(l.module_id);
            if (cid) lessonCounts[cid] = (lessonCounts[cid] || 0) + 1;
          }
        }
      }

      setCourses(rawRows.map((c: any) => ({
        id: c.id, title: c.title, title_pt: c.title_pt || null, short_description: c.short_description, short_description_pt: c.short_description_pt || null,
        image_url: c.image_url, is_free: c.is_free, price: c.price,
        average_rating: c.average_rating || 0, total_students: c.total_students || 0,
        is_featured: c.is_featured, author_name: authorMap[c.author_id] || "Instructor",
        category_name: c.categories?.name || "General", category_name_pt: c.categories?.name_pt || null, category_id: c.category_id,
        lesson_count: lessonCounts[c.id] || 0,
      })));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const updateParams = (cat: string, q: string) => {
    const params: Record<string, string> = {};
    if (cat) params.category = cat;
    if (q) params.search = q;
    setSearchParams(params, { replace: true });
  };

  const handleCategoryClick = (catId: string) => {
    const next = selectedCategory === catId ? "" : catId;
    setSelectedCategory(next);
    updateParams(next, search);
  };

  const handleSearchChange = (val: string) => { setSearch(val); updateParams(selectedCategory, val); };

  const clearFilters = () => {
    setSelectedCategory(""); setSearch(""); setPriceFilter("all");
    setSearchParams({}, { replace: true });
  };

  const filtered = courses.filter((c) => {
    const matchCat = !selectedCategory || c.category_id === selectedCategory;
    const displayTitle = localized(c, "title", lang);
    const displayDesc = localized(c, "short_description", lang);
    const matchSearch = !search || displayTitle.toLowerCase().includes(search.toLowerCase()) || displayDesc.toLowerCase().includes(search.toLowerCase());
    const matchPrice = priceFilter === "all" || (priceFilter === "free" && c.is_free) || (priceFilter === "paid" && !c.is_free);
    return matchCat && matchSearch && matchPrice;
  });

  const selectedCategoryName = (() => { const c = categories.find((c) => c.id === selectedCategory); return c ? localized(c, "name", lang) : undefined; })();
  const hasFilters = !!selectedCategory || !!search || priceFilter !== "all";

  const FilterContent = () => (
    <div className="space-y-6">
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">{t("courses_search")}</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => handleSearchChange(e.target.value)} placeholder={t("courses_search_placeholder")} className="pl-9" />
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">{t("courses_price")}</label>
        <div className="flex flex-col gap-1.5">
          {(["all", "free", "paid"] as const).map((opt) => (
            <button key={opt} onClick={() => setPriceFilter(opt)}
              className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${priceFilter === opt ? "bg-secondary text-secondary-foreground font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            >
              {opt === "all" ? t("courses_all_filter") : opt === "free" ? t("courses_free") : t("courses_paid")}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">{t("courses_category")}</label>
        <div className="flex flex-col gap-1.5">
          <button onClick={() => handleCategoryClick("")}
            className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${!selectedCategory ? "bg-secondary text-secondary-foreground font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
          >
            {t("courses_all_categories")}
          </button>
          {categories.map((cat) => (
            <button key={cat.id} onClick={() => handleCategoryClick(cat.id)}
              className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedCategory === cat.id ? "bg-secondary text-secondary-foreground font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            >
              {localized(cat, "name", lang)}
            </button>
          ))}
        </div>
      </div>

      {hasFilters && (
        <button onClick={clearFilters} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-3.5 w-3.5" /> {t("courses_clear_filters")}
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 pt-20 sm:pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6 sm:mb-10">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <span className="text-sm font-semibold text-secondary uppercase tracking-wider">{t("courses_catalog")}</span>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-foreground mt-2 mb-2">
                {t("courses_all")} <span className="text-secondary">{t("courses_title")}</span>
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                {loading ? t("courses_loading") : `${filtered.length} curso${filtered.length !== 1 ? "s" : ""} ${filtered.length !== 1 ? t("courses_available_p") : t("courses_available")}`}
                {selectedCategoryName && <span> {t("courses_in")} <strong>{selectedCategoryName}</strong></span>}
              </p>
            </motion.div>
          </div>

          <div className="lg:hidden mb-4">
            <button onClick={() => setFiltersOpen((v) => !v)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-sm font-medium text-foreground w-full justify-between"
            >
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-secondary" />
                {t("courses_filters")}
                {hasFilters && <span className="h-2 w-2 rounded-full bg-secondary" />}
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {filtersOpen && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="mt-3 p-4 rounded-xl border border-border bg-card"><FilterContent /></div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            <aside className="hidden lg:block lg:w-60 shrink-0">
              <div className="sticky top-24"><FilterContent /></div>
            </aside>

            <div className="flex-1">
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="rounded-2xl bg-card border border-border animate-pulse">
                      <div className="h-44 bg-muted rounded-t-2xl" />
                      <div className="p-5 space-y-3">
                        <div className="h-3 bg-muted rounded w-1/3" />
                        <div className="h-4 bg-muted rounded w-full" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16 sm:py-24 text-muted-foreground">
                  <SlidersHorizontal className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium text-foreground">{t("courses_no_results")}</p>
                  <p className="text-sm mt-1">{t("courses_try_filters")}</p>
                  {hasFilters && <Button variant="outline" className="mt-4" onClick={clearFilters}>{t("courses_clear_filters")}</Button>}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                  {filtered.map((course, i) => (
                    <motion.div key={course.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <Link to={`/courses/${course.id}`}
                        className="block group rounded-2xl overflow-hidden bg-card border border-border hover:shadow-xl hover:shadow-secondary/5 transition-all duration-300"
                      >
                        <div className="relative h-40 sm:h-44 overflow-hidden bg-muted">
                          {course.image_url ? (
                            <img src={course.image_url} alt={localized(course, "title", lang)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary/10">
                              <BookOpen className="h-12 w-12 text-primary/30" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-primary/60 to-transparent" />
                          <div className="absolute top-3 left-3">
                            <Badge className={course.is_free ? "bg-emerald-500/90 text-white border-0" : "bg-secondary text-secondary-foreground border-0"}>
                              {course.is_free ? t("courses_free") : `$${Number(course.price).toFixed(2)}`}
                            </Badge>
                          </div>
                          {course.is_featured && (
                            <div className="absolute top-3 right-3">
                              <Badge className="bg-secondary/90 text-secondary-foreground border-0 text-xs">⭐ {t("featured_star")}</Badge>
                            </div>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="h-12 w-12 rounded-full bg-secondary/90 flex items-center justify-center">
                              <Play className="h-5 w-5 text-secondary-foreground fill-current" />
                            </div>
                          </div>
                        </div>

                        <div className="p-4 sm:p-5">
                          <span className="text-xs font-medium text-secondary">{localized(course, "category_name", lang)}</span>
                          <h3 className="text-sm sm:text-base font-semibold text-card-foreground mt-1 mb-2 line-clamp-2">{localized(course, "title", lang)}</h3>
                          <p className="text-sm text-muted-foreground mb-3">{t("featured_by")} {course.author_name}</p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Star className="h-3.5 w-3.5 text-secondary fill-current" />
                              {course.average_rating > 0 ? course.average_rating.toFixed(1) : t("featured_new")}
                            </span>
                            <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{course.total_students.toLocaleString()}</span>
                            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{course.lesson_count} {t("featured_lessons")}</span>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Courses;
