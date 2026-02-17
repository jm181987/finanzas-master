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

interface Course {
  id: string;
  title: string;
  short_description: string | null;
  image_url: string | null;
  is_free: boolean;
  price: number;
  average_rating: number;
  total_students: number;
  is_featured: boolean;
  author_name: string;
  category_name: string;
  category_id: string | null;
  lesson_count: number;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

const Courses = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "");
  const [priceFilter, setPriceFilter] = useState<"all" | "free" | "paid">("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const cat = searchParams.get("category") || "";
    const q = searchParams.get("search") || "";
    setSelectedCategory(cat);
    setSearch(q);
  }, [searchParams]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: cats } = await supabase
        .from("categories")
        .select("id, name, slug")
        .order("name");
      setCategories(cats || []);

      const { data, error } = await supabase
        .from("courses")
        .select("id, title, short_description, image_url, is_free, price, average_rating, total_students, is_featured, author_id, category_id, categories(name)")
        .eq("is_published", true)
        .eq("status", "approved")
        .order("is_featured", { ascending: false });

      if (error) throw error;

      const authorIds = [...new Set((data || []).map((c) => c.author_id))];
      let authorMap: Record<string, string> = {};
      if (authorIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", authorIds);
        for (const p of profiles || []) authorMap[p.id] = p.full_name || "Instructor";
      }

      const courseIds = (data || []).map((c) => c.id);
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

      setCourses(
        (data || []).map((c: any) => ({
          id: c.id,
          title: c.title,
          short_description: c.short_description,
          image_url: c.image_url,
          is_free: c.is_free,
          price: c.price,
          average_rating: c.average_rating || 0,
          total_students: c.total_students || 0,
          is_featured: c.is_featured,
          author_name: authorMap[c.author_id] || "Instructor",
          category_name: c.categories?.name || "General",
          category_id: c.category_id,
          lesson_count: lessonCounts[c.id] || 0,
        }))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
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

  const handleSearchChange = (val: string) => {
    setSearch(val);
    updateParams(selectedCategory, val);
  };

  const clearFilters = () => {
    setSelectedCategory("");
    setSearch("");
    setPriceFilter("all");
    setSearchParams({}, { replace: true });
  };

  const filtered = courses.filter((c) => {
    const matchCat = !selectedCategory || c.category_id === selectedCategory;
    const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || (c.short_description || "").toLowerCase().includes(search.toLowerCase());
    const matchPrice = priceFilter === "all" || (priceFilter === "free" && c.is_free) || (priceFilter === "paid" && !c.is_free);
    return matchCat && matchSearch && matchPrice;
  });

  const selectedCategoryName = categories.find((c) => c.id === selectedCategory)?.name;
  const hasFilters = !!selectedCategory || !!search || priceFilter !== "all";

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Search */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Buscar</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar cursos..."
            className="pl-9"
          />
        </div>
      </div>

      {/* Price */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Precio</label>
        <div className="flex flex-col gap-1.5">
          {(["all", "free", "paid"] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setPriceFilter(opt)}
              className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${priceFilter === opt ? "bg-secondary text-secondary-foreground font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            >
              {opt === "all" ? "Todos" : opt === "free" ? "Gratis" : "De pago"}
            </button>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Categoría</label>
        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => handleCategoryClick("")}
            className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${!selectedCategory ? "bg-secondary text-secondary-foreground font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
          >
            Todas
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedCategory === cat.id ? "bg-secondary text-secondary-foreground font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {hasFilters && (
        <button onClick={clearFilters} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-3.5 w-3.5" /> Limpiar filtros
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 pt-20 sm:pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-6 sm:mb-10">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <span className="text-sm font-semibold text-secondary uppercase tracking-wider">Catálogo</span>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-foreground mt-2 mb-2">
                Todos los <span className="text-secondary">cursos</span>
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                {loading ? "Cargando..." : `${filtered.length} curso${filtered.length !== 1 ? "s" : ""} disponible${filtered.length !== 1 ? "s" : ""}`}
                {selectedCategoryName && <span> en <strong>{selectedCategoryName}</strong></span>}
              </p>
            </motion.div>
          </div>

          {/* Mobile filter toggle */}
          <div className="lg:hidden mb-4">
            <button
              onClick={() => setFiltersOpen((v) => !v)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-sm font-medium text-foreground w-full justify-between"
            >
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-secondary" />
                Filtros
                {hasFilters && <span className="h-2 w-2 rounded-full bg-secondary" />}
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {filtersOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 p-4 rounded-xl border border-border bg-card">
                    <FilterContent />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Sidebar — desktop only */}
            <aside className="hidden lg:block lg:w-60 shrink-0">
              <div className="sticky top-24">
                <FilterContent />
              </div>
            </aside>

            {/* Grid */}
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
                  <p className="text-lg font-medium text-foreground">No se encontraron cursos</p>
                  <p className="text-sm mt-1">Prueba con otros filtros</p>
                  {hasFilters && (
                    <Button variant="outline" className="mt-4" onClick={clearFilters}>Limpiar filtros</Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                  {filtered.map((course, i) => (
                    <motion.div
                      key={course.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Link
                        to={`/courses/${course.id}`}
                        className="block group rounded-2xl overflow-hidden bg-card border border-border hover:shadow-xl hover:shadow-secondary/5 transition-all duration-300"
                      >
                        <div className="relative h-40 sm:h-44 overflow-hidden bg-muted">
                          {course.image_url ? (
                            <img src={course.image_url} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary/10">
                              <BookOpen className="h-12 w-12 text-primary/30" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-primary/60 to-transparent" />
                          <div className="absolute top-3 left-3">
                            <Badge className={course.is_free ? "bg-emerald-500/90 text-white border-0" : "bg-secondary text-secondary-foreground border-0"}>
                              {course.is_free ? "Gratis" : `$${Number(course.price).toFixed(2)}`}
                            </Badge>
                          </div>
                          {course.is_featured && (
                            <div className="absolute top-3 right-3">
                              <Badge className="bg-secondary/90 text-secondary-foreground border-0 text-xs">⭐ Destacado</Badge>
                            </div>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="h-12 w-12 rounded-full bg-secondary/90 flex items-center justify-center">
                              <Play className="h-5 w-5 text-secondary-foreground fill-current" />
                            </div>
                          </div>
                        </div>

                        <div className="p-4 sm:p-5">
                          <span className="text-xs font-medium text-secondary">{course.category_name}</span>
                          <h3 className="text-sm sm:text-base font-semibold text-card-foreground mt-1 mb-2 line-clamp-2">{course.title}</h3>
                          <p className="text-sm text-muted-foreground mb-3">por {course.author_name}</p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Star className="h-3.5 w-3.5 text-secondary fill-current" />
                              {course.average_rating > 0 ? course.average_rating.toFixed(1) : "Nuevo"}
                            </span>
                            <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{course.total_students.toLocaleString()}</span>
                            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{course.lesson_count} lec.</span>
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
