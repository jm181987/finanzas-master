import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { BookOpen, TrendingUp, Award, CheckCircle2, Play, Trophy, KeyRound, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { toast } from "sonner";

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
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);

  // Password change state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  useEffect(() => {
    if (user) fetchEnrollments();
  }, [user]);

  const fetchEnrollments = async () => {
    try {
      // Get enrollments with course data
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("course_id, enrolled_at, completed_at, courses(id, title, image_url, is_free)")
        .eq("user_id", user!.id)
        .order("enrolled_at", { ascending: false });

      if (!enrollments || enrollments.length === 0) {
        setLoading(false);
        return;
      }

      const courseIds = enrollments.map((e) => e.course_id);

      // Get modules for those courses
      const { data: modules } = await supabase
        .from("modules")
        .select("id, course_id")
        .in("course_id", courseIds);

      const moduleIds = (modules || []).map((m) => m.id);
      const moduleToCourse = new Map((modules || []).map((m) => [m.id, m.course_id]));

      // Count total lessons per course
      const lessonCountMap: Record<string, number> = {};
      if (moduleIds.length > 0) {
        const { data: lessons } = await supabase
          .from("lessons")
          .select("module_id")
          .in("module_id", moduleIds);
        for (const l of lessons || []) {
          const cid = moduleToCourse.get(l.module_id);
          if (cid) lessonCountMap[cid] = (lessonCountMap[cid] || 0) + 1;
        }
      }

      // Get completed lessons for this user across those lessons
      const { data: progress } = await supabase
        .from("lesson_progress")
        .select("lesson_id")
        .eq("user_id", user!.id)
        .eq("completed", true);

      const completedLessonIds = new Set((progress || []).map((p) => p.lesson_id));

      // Count completed lessons per course
      const completedMap: Record<string, number> = {};
      if (moduleIds.length > 0) {
        const { data: allLessons } = await supabase
          .from("lessons")
          .select("id, module_id")
          .in("module_id", moduleIds);
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
            id: c.id,
            title: c.title,
            image_url: c.image_url,
            is_free: c.is_free,
            enrolled_at: e.enrolled_at,
            completed_at: e.completed_at,
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

  const handlePasswordChange = async () => {
    if (!newPassword || !confirmPassword) { toast.error("Completa ambos campos"); return; }
    if (newPassword.length < 6) { toast.error("La contraseña debe tener al menos 6 caracteres"); return; }
    if (newPassword !== confirmPassword) { toast.error("Las contraseñas no coinciden"); return; }
    setSavingPwd(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPwd(false);
    if (error) { toast.error("Error al cambiar contraseña: " + error.message); return; }
    toast.success("Contraseña actualizada correctamente");
    setNewPassword("");
    setConfirmPassword("");
  };

  const stats = [
    { icon: BookOpen, label: "Cursos Inscritos", value: String(courses.length) },
    { icon: TrendingUp, label: "En Progreso", value: String(inProgressCount) },
    { icon: Award, label: "Completados", value: String(completedCount) },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold text-foreground">
              ¡Bienvenido, {user?.user_metadata?.full_name || "Estudiante"}!
            </h1>
            <p className="text-muted-foreground mt-1">
              {role === "admin" && "👑 Administrador — "}
              {role === "developer" && "🛠️ Desarrollador — "}
              Tu panel de aprendizaje
            </p>
          </div>

          {/* Stats */}
          <div className="grid sm:grid-cols-3 gap-6 mb-10">
            {stats.map((stat) => (
              <Card key={stat.label} className="border-border">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                  <stat.icon className="h-5 w-5 text-secondary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Courses list */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-display">Mis Cursos</CardTitle>
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
                  <p className="text-lg font-medium">Aún no estás inscrito en ningún curso</p>
                  <p className="text-sm mt-1 mb-6">Explora nuestro catálogo y comienza tu aprendizaje</p>
                  <Link to="/#cursos">
                    <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
                      Explorar cursos
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {courses.map((course) => {
                    const pct = course.lesson_count > 0
                      ? Math.round((course.completed_lessons / course.lesson_count) * 100)
                      : 0;
                    const isDone = !!course.completed_at || (course.lesson_count > 0 && course.completed_lessons >= course.lesson_count);

                    return (
                      <Link
                        key={course.id}
                        to={`/courses/${course.id}`}
                        className="flex gap-4 p-4 rounded-xl border border-border hover:border-secondary/40 hover:bg-muted/30 transition-all duration-200 group"
                      >
                        {/* Thumbnail */}
                        <div className="w-20 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                          {course.image_url ? (
                            <img src={course.image_url} alt={course.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <BookOpen className="h-6 w-6 text-muted-foreground/40" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className="font-semibold text-foreground text-sm line-clamp-1 group-hover:text-secondary transition-colors">
                              {course.title}
                            </h3>
                            {isDone ? (
                              <Badge className="bg-emerald-500/10 text-emerald-600 border-0 shrink-0 text-xs flex items-center gap-1">
                                <Trophy className="h-3 w-3" /> Completado
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="shrink-0 text-xs flex items-center gap-1 border-secondary/30 text-secondary">
                                <Play className="h-3 w-3" /> En progreso
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            {course.completed_lessons} de {course.lesson_count} lecciones completadas
                          </p>
                          <div className="flex items-center gap-2">
                            <Progress value={pct} className="h-1.5 flex-1" />
                            <span className="text-xs text-muted-foreground shrink-0">{pct}%</span>
                          </div>
                        </div>

                        {/* Arrow */}
                        <div className="flex items-center text-muted-foreground group-hover:text-secondary transition-colors shrink-0">
                          {isDone ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          ) : (
                            <Play className="h-5 w-5" />
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
          {/* Password change */}
          <Card className="border-border mt-8">
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <KeyRound className="h-5 w-5 text-secondary" />
              <CardTitle className="font-display text-base">Cambiar contraseña</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-w-sm">
              <div className="space-y-1.5">
                <Label>Nueva contraseña</Label>
                <div className="relative">
                  <Input
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Confirmar nueva contraseña</Label>
                <div className="relative">
                  <Input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button onClick={handlePasswordChange} disabled={savingPwd} className="w-full">
                {savingPwd ? "Guardando..." : "Actualizar contraseña"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
