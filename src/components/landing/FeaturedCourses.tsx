import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Star, Clock, Users, Play, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

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
  author_name?: string;
  category_name?: string;
  lesson_count?: number;
}

const FeaturedCourses = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const { data, error } = await supabase
          .from("courses")
          .select(`
            id, title, short_description, image_url, is_free, price,
            average_rating, total_students, is_featured, author_id,
            categories(name),
            profiles!courses_author_id_fkey(full_name)
          `)
          .eq("is_published", true)
          .eq("status", "approved")
          .order("is_featured", { ascending: false })
          .limit(8);

        if (error) throw error;

        // Fetch lesson counts per course via modules
        const courseIds = (data || []).map((c) => c.id);
        let lessonCounts: Record<string, number> = {};
        if (courseIds.length > 0) {
          const { data: modules } = await supabase
            .from("modules")
            .select("id, course_id")
            .in("course_id", courseIds);

          const moduleIds = (modules || []).map((m) => m.id);
          const moduleMap = new Map((modules || []).map((m) => [m.id, m.course_id]));

          if (moduleIds.length > 0) {
            const { data: lessons } = await supabase
              .from("lessons")
              .select("module_id")
              .in("module_id", moduleIds);

            for (const lesson of lessons || []) {
              const courseId = moduleMap.get(lesson.module_id);
              if (courseId) lessonCounts[courseId] = (lessonCounts[courseId] || 0) + 1;
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
            author_name: c.profiles?.full_name || "Instructor",
            category_name: c.categories?.name || "General",
            lesson_count: lessonCounts[c.id] || 0,
          }))
        );
      } catch (err) {
        console.error("Error fetching courses:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  return (
    <section id="cursos" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <span className="text-sm font-semibold text-secondary uppercase tracking-wider">Cursos Destacados</span>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mt-3">
            Aprende de los <span className="text-secondary">mejores expertos</span>
          </h2>
        </motion.div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
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
        ) : courses.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Próximamente habrá cursos disponibles</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {courses.map((course, i) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group rounded-2xl overflow-hidden bg-card border border-border hover:shadow-xl hover:shadow-secondary/5 transition-all duration-300"
              >
                {/* Image */}
                <div className="relative h-44 overflow-hidden bg-muted">
                  {course.image_url ? (
                    <img
                      src={course.image_url}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
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

                {/* Content */}
                <div className="p-5">
                  <span className="text-xs font-medium text-secondary">{course.category_name}</span>
                  <h3 className="text-base font-semibold text-card-foreground mt-1 mb-2 line-clamp-2">
                    {course.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">por {course.author_name}</p>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 text-secondary fill-current" />
                      {course.average_rating > 0 ? course.average_rating.toFixed(1) : "Nuevo"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {course.total_students.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {course.lesson_count} lecciones
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {courses.length > 0 && (
          <div className="text-center mt-10">
            <Link to="/courses">
              <Button variant="outline" size="lg" className="border-secondary/40 text-secondary hover:bg-secondary/10">
                Ver todos los cursos
              </Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedCourses;
