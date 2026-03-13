import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { localized } from "@/lib/localized";
import { BookOpen, TrendingUp, Award, CheckCircle2, Play, Trophy, Download } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

interface EnrolledCourse {
  id: string;
  title: string;
  image_url: string | null;
  is_free: boolean;
  enrolled_at: string;
  completed_at: string | null;
  lesson_count: number;
  completed_lessons: number;
}

const Dashboard = () => {
  const { user, role } = useAuth();
  const { t, lang } = useLanguage();
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const { canInstall, install, showIOSPrompt, dismissIOSPrompt } = usePWAInstall();

  useEffect(() => {
    if (user) fetchEnrollments();
  }, [user]);

  const fetchEnrollments = async () => {
    try {
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("course_id, enrolled_at, completed_at, courses(id, title, title_pt, image_url, is_free)")
        .eq("user_id", user!.id)
        .order("enrolled_at", { ascending: false });

      if (!enrollments || enrollments.length === 0) { setLoading(false); return; }

      const courseIds = enrollments.map((e) => e.course_id);
      const { data: modules } = await supabase.from("modules").select("id, course_id").in("course_id", courseIds);
      const moduleIds = (modules || []).map((m) => m.id);
      const moduleToCourse = new Map((modules || []).map((m) => [m.id, m.course_id]));

      const lessonCountMap: Record<string, number> = {};
      if (moduleIds.length > 0) {
        const { data: lessons } = await supabase.from("lessons").select("module_id").in("module_id", moduleIds);
        for (const l of lessons || []) {
          const cid = moduleToCourse.get(l.module_id);
          if (cid) lessonCountMap[cid] = (lessonCountMap[cid] || 0) + 1;
        }
      }

      const { data: progress } = await supabase.from("lesson_progress").select("lesson_id").eq("user_id", user!.id).eq("completed", true);
      const completedLessonIds = new Set((progress || []).map((p) => p.lesson_id));

      const completedMap: Record<string, number> = {};
      if (moduleIds.length > 0) {
        const { data: allLessons } = await supabase.from("lessons").select("id, module_id").in("module_id", moduleIds);
        for (const l of allLessons || []) {
          if (completedLessonIds.has(l.id)) {
            const cid = moduleToCourse.get(l.module_id);
            if (cid) completedMap[cid] = (completedMap[cid] || 0) + 1;
          }
        }
      }

      setCourses(
        enrollments.map((e) => {
          const c = e.courses as any;
          return {
            id: c.id, title: localized(c, "title", lang), image_url: c.image_url, is_free: c.is_free,
            enrolled_at: e.enrolled_at, completed_at: e.completed_at,
            lesson_count: lessonCountMap[c.id] || 0,
            completed_lessons: completedMap[c.id] || 0,
          };
        })
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const completedCount = courses.filter((c) => c.completed_at).length;
  const inProgressCount = courses.filter((c) => !c.completed_at && c.completed_lessons > 0).length;

  const stats = [
    { icon: BookOpen, label: t("dash_enrolled"), value: String(courses.length) },
    { icon: TrendingUp, label: t("dash_in_progress"), value: String(inProgressCount) },
    { icon: Award, label: t("dash_completed"), value: String(completedCount) },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold text-foreground">
              {t("dash_welcome")} {user?.user_metadata?.full_name || t("dash_student")}!
            </h1>
            <p className="text-muted-foreground mt-1">
              {role === "admin" && `👑 ${t("dash_admin_badge")} — `}
              {role === "developer" && `🛠️ ${t("dash_dev_badge")} — `}
              {role === "instructor" && `📚 ${t("admin_role_instructor")} — `}
              {role === "agente" && `🤝 ${t("admin_role_agente")} — `}
              {t("dash_learning_panel")}
            </p>
            {canInstall && (
              <Button onClick={install} variant="outline" className="mt-3 gap-2">
                <Download className="h-4 w-4" /> {t("pwa_install")}
              </Button>
            )}

          </div>

          <div className="grid sm:grid-cols-3 gap-6 mb-10">
            {stats.map((stat) => (
              <Card key={stat.label} className="border-border">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                  <stat.icon className="h-5 w-5 text-secondary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-display">{t("dash_my_courses")}</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex gap-4 animate-pulse">
                      <div className="w-20 h-14 bg-muted rounded-lg shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-2/3" />
                        <div className="h-3 bg-muted rounded w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : courses.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 text-secondary/30" />
                  <p className="text-lg font-medium">{t("dash_no_courses")}</p>
                  <p className="text-sm mt-1 mb-6">{t("dash_explore_desc")}</p>
                  <Link to="/#cursos">
                    <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
                      {t("dash_explore_btn")}
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {courses.map((course) => {
                    const pct = course.lesson_count > 0 ? Math.round((course.completed_lessons / course.lesson_count) * 100) : 0;
                    const isDone = !!course.completed_at || (course.lesson_count > 0 && course.completed_lessons >= course.lesson_count);
                    return (
                      <Link key={course.id} to={`/courses/${course.id}`}
                        className="flex gap-4 p-4 rounded-xl border border-border hover:border-secondary/40 hover:bg-muted/30 transition-all duration-200 group"
                      >
                        <div className="w-20 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                          {course.image_url ? (
                            <img src={course.image_url} alt={course.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <BookOpen className="h-6 w-6 text-muted-foreground/40" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className="font-semibold text-foreground text-sm line-clamp-1 group-hover:text-secondary transition-colors">{course.title}</h3>
                            {isDone ? (
                              <Badge className="bg-emerald-500/10 text-emerald-600 border-0 shrink-0 text-xs flex items-center gap-1">
                                <Trophy className="h-3 w-3" /> {t("dash_completed_badge")}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="shrink-0 text-xs flex items-center gap-1 border-secondary/30 text-secondary">
                                <Play className="h-3 w-3" /> {t("dash_in_progress_badge")}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            {course.completed_lessons} {t("dash_lessons_of")} {course.lesson_count} {t("dash_lessons_completed")}
                          </p>
                          <div className="flex items-center gap-2">
                            <Progress value={pct} className="h-1.5 flex-1" />
                            <span className="text-xs text-muted-foreground shrink-0">{pct}%</span>
                          </div>
                        </div>
                        <div className="flex items-center text-muted-foreground group-hover:text-secondary transition-colors shrink-0">
                          {isDone ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Play className="h-5 w-5" />}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
