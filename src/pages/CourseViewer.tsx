import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, CheckCircle2, Circle, Lock,
  Play, FileText, File, BookOpen, Menu, X, LogIn, Trophy, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { localized } from "@/lib/localized";

interface Course {
  id: string;
  title: string;
  title_pt: string | null;
  description: string | null;
  description_pt: string | null;
  image_url: string | null;
  is_free: boolean;
  price: number;
  author_name: string;
}

interface Lesson {
  id: string;
  title: string;
  title_pt: string | null;
  content_type: string;
  video_url: string | null;
  content_text: string | null;
  content_text_pt: string | null;
  pdf_url: string | null;
  duration_minutes: number | null;
  is_free_preview: boolean;
  sort_order: number;
  completed?: boolean;
}

interface Module {
  id: string;
  title: string;
  title_pt: string | null;
  sort_order: number;
  lessons: Lesson[];
}

const contentIcon = (type: string) => {
  if (type === "video") return <Play className="h-3.5 w-3.5" />;
  if (type === "pdf") return <File className="h-3.5 w-3.5" />;
  return <FileText className="h-3.5 w-3.5" />;
};

// Extract YouTube video ID
const getYouTubeId = (url: string) => {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([^&?/]+)/);
  return match ? match[1] : null;
};

const CourseViewer = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { toast } = useToast();
  const { t, lang } = useLanguage();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [enrolled, setEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [courseCompleted, setCourseCompleted] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  useEffect(() => {
    if (id) fetchCourse();
  }, [id, user]);

  const fetchCourse = async () => {
    setLoading(true);
    try {
      // Fetch course
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select("id, title, title_pt, description, description_pt, image_url, is_free, price, author_id")
        .eq("id", id!)
        .eq("is_published", true)
        .eq("status", "approved")
        .single();

      if (courseError || !courseData) {
        navigate("/");
        return;
      }

      // Check if author is an instructor — restrict access to agente/admin only
      const authorId = (courseData as any).author_id;
      const { data: authorRole } = await (supabase.rpc as any)("get_user_role", { _user_id: authorId });
      if (authorRole === "instructor" && role !== "admin" && role !== "agente") {
        navigate("/courses");
        return;
      }

      // Get author name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", (courseData as any).author_id)
        .single();

      const raw = courseData as any;

      // Fetch collaborator names
      const { data: collabs } = await (supabase as any).from("course_collaborators").select("user_id").eq("course_id", raw.id);
      let collabNames: string[] = [];
      if (collabs && collabs.length > 0) {
        const collabIds = collabs.map((c: any) => c.user_id);
        const { data: collabProfiles } = await supabase.from("profiles").select("id, full_name").in("id", collabIds);
        collabNames = (collabProfiles || []).map((p: any) => p.full_name).filter(Boolean);
      }
      const allNames = [profile?.full_name || "Instructor", ...collabNames].join(", ");

      setCourse({
        id: raw.id, title: raw.title, title_pt: raw.title_pt || null,
        description: raw.description, description_pt: raw.description_pt || null,
        image_url: raw.image_url, is_free: raw.is_free, price: raw.price,
        author_name: allNames,
      });

      // Check enrollment — auto-enroll if course is free
      let isEnrolled = false;
      if (user) {
        const { data: enrollment } = await supabase
          .from("enrollments")
          .select("id")
          .eq("course_id", id!)
          .eq("user_id", user.id)
          .maybeSingle();
        isEnrolled = !!enrollment;

        // Auto-enroll for free courses
        if (!isEnrolled && courseData.is_free) {
          const { error: enrollErr } = await supabase
            .from("enrollments")
            .insert({ user_id: user.id, course_id: id! });
          if (!enrollErr) {
            isEnrolled = true;
            // Sync total_students count in background
            fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-stats`, {
              method: "POST",
              headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
            }).catch(() => null);
          }
        }

        setEnrolled(isEnrolled);
      }

      // Fetch modules + lessons
      const { data: mods } = await supabase
        .from("modules")
        .select("id, title, title_pt, sort_order")
        .eq("course_id", id!)
        .order("sort_order");

      const { data: lessonRows } = await supabase
        .from("lessons")
        .select("id, title, title_pt, content_type, video_url, content_text, content_text_pt, pdf_url, duration_minutes, is_free_preview, sort_order, module_id")
        .in("module_id", (mods || []).map((m) => m.id))
        .order("sort_order");

      // Fetch completed lessons
      let completed = new Set<string>();
      if (user) {
        const { data: progress } = await supabase
          .from("lesson_progress")
          .select("lesson_id")
          .eq("user_id", user.id)
          .eq("completed", true);
        completed = new Set((progress || []).map((p) => p.lesson_id));
        setCompletedIds(completed);
      }

      const builtModules: Module[] = (mods || []).map((mod: any) => ({
        id: mod.id,
        title: mod.title,
        title_pt: mod.title_pt || null,
        sort_order: mod.sort_order,
        lessons: (lessonRows || [])
          .filter((l: any) => l.module_id === mod.id)
          .map((l: any) => ({
            id: l.id, title: l.title, title_pt: l.title_pt || null,
            content_type: l.content_type, video_url: l.video_url,
            content_text: l.content_text, content_text_pt: l.content_text_pt || null,
            pdf_url: l.pdf_url, duration_minutes: l.duration_minutes,
            is_free_preview: l.is_free_preview, sort_order: l.sort_order,
            completed: completed.has(l.id),
          })),
      }));

      setModules(builtModules);
      setExpandedModules(new Set((mods || []).map((m) => m.id)));

      // Check if already completed (enrollment has completed_at set)
      if (isEnrolled) {
        const { data: enrollment } = await supabase
          .from("enrollments")
          .select("completed_at")
          .eq("course_id", id!)
          .eq("user_id", user!.id)
          .maybeSingle();
        if (enrollment?.completed_at) {
          setCourseCompleted(true);
        } else {
          // If all lessons are already done but enrollment not marked, fix via edge function
          const allCourseLessons = builtModules.flatMap((m) => m.lessons);
          const totalLessons = allCourseLessons.length;
          const completedInCourse = allCourseLessons.filter((l) => completed.has(l.id)).length;
          if (completedInCourse >= totalLessons && totalLessons > 0) {
            const { data: { session } } = await supabase.auth.getSession();
            await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/complete-course`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({ course_id: id }),
              }
            );
            setCourseCompleted(true);
          }
        }
      }

      // Set first accessible lesson as active
      const firstLesson = builtModules.flatMap((m) => m.lessons).find((l) =>
        isEnrolled || courseData.is_free || l.is_free_preview
      );
      if (firstLesson) setActiveLesson(firstLesson);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!user) {
      navigate("/login", { state: { from: `/courses/${id}` } });
      return;
    }
    setEnrolling(true);
    try {
      const { error } = await supabase
        .from("enrollments")
        .insert({ user_id: user.id, course_id: id! });
      if (error) throw error;
      setEnrolled(true);
      toast({ title: t("cv_enroll_success"), description: t("cv_enroll_success_desc") });
      // Sync total_students in background
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-stats`, {
        method: "POST",
        headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
      }).catch(() => null);
      fetchCourse();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setEnrolling(false);
    }
  };

  const checkCourseCompletion = useCallback(async (newCompletedIds: Set<string>, totalLessons: number) => {
    if (!user || courseCompleted || totalLessons === 0) return;
    if (newCompletedIds.size < totalLessons) return;

    // Double-check: verify ALL lesson IDs from modules are in the completed set
    const allLessonIds = modules.flatMap((m) => m.lessons.map((l) => l.id));
    const allDone = allLessonIds.length > 0 && allLessonIds.every((lid) => newCompletedIds.has(lid));
    if (!allDone) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/complete-course`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ course_id: id }),
        }
      );
      const body = await res.json();
      if (!res.ok) {
        // "Not all lessons completed" is expected when server count differs — silently ignore
        if (body?.error?.includes?.("Not all lessons")) return;
        console.error("Error marking course complete:", body);
        return;
      }
      setCourseCompleted(true);
      setShowCompletionModal(true);
    } catch (err) {
      console.error("Error marking course complete:", err);
    }
  }, [user, courseCompleted, id, modules]);

  const markCompleted = useCallback(async (lessonId: string, currentModules: Module[]) => {
    if (!user) return;
    const canTrack = enrolled || course?.is_free;
    if (!canTrack) return;
    if (completedIds.has(lessonId)) return;
    try {
      const { error } = await supabase.from("lesson_progress").upsert(
        {
          user_id: user.id,
          lesson_id: lessonId,
          completed: true,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "user_id,lesson_id" }
      );
      if (error) {
        console.error("Error marking lesson complete:", error);
        toast({ title: "Error al guardar progreso", description: error.message, variant: "destructive" });
        return;
      }
      const newIds = new Set([...completedIds, lessonId]);
      setCompletedIds(newIds);
      setModules((prev) =>
        prev.map((mod) => ({
          ...mod,
          lessons: mod.lessons.map((l) =>
            l.id === lessonId ? { ...l, completed: true } : l
          ),
        }))
      );
      // Check completion against total lesson count from currentModules arg (avoids stale state)
      const totalLessons = currentModules.flatMap((m) => m.lessons).length;
      await checkCourseCompletion(newIds, totalLessons);
    } catch (err) {
      console.error(err);
    }
  }, [user, enrolled, course, completedIds, checkCourseCompletion, toast]);

  const selectLesson = (lesson: Lesson) => {
    const canAccess = enrolled || course?.is_free || lesson.is_free_preview;
    if (!canAccess) {
      toast({ title: t("cv_locked"), description: t("cv_locked_desc"), variant: "destructive" });
      return;
    }
    setActiveLesson(lesson);
    if (user && (enrolled || course?.is_free)) markCompleted(lesson.id, modules);
  };

  const allLessons = modules.flatMap((m) => m.lessons);
  const completedCount = allLessons.filter((l) => completedIds.has(l.id)).length;
  const progressPct = allLessons.length > 0 ? Math.round((completedCount / allLessons.length) * 100) : 0;

  const currentIndex = activeLesson ? allLessons.findIndex((l) => l.id === activeLesson.id) : -1;
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-2 border-secondary border-t-transparent animate-spin" />
          <p className="text-muted-foreground text-sm">{t("cv_loading")}</p>
        </div>
      </div>
    );
  }

  if (!course) return null;

  // --- Not enrolled / not free: show landing CTA ---
  if (!enrolled && !course.is_free) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border px-6 py-4 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-5 w-5" />
            <span className="text-sm">{t("cv_home")}</span>
          </Link>
        </header>
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          {course.image_url && (
             <img src={course.image_url} alt={localized(course, "title", lang)} className="w-full max-h-64 object-cover rounded-2xl mb-8" />
          )}
          <Badge className="mb-4 bg-secondary/10 text-secondary border-0">{course.is_free ? "Gratis" : `$${Number(course.price).toFixed(2)}`}</Badge>
          <h1 className="text-3xl font-display font-bold text-foreground mb-4">{localized(course, "title", lang)}</h1>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">{localized(course, "description", lang)}</p>
          <p className="text-sm text-muted-foreground mb-6">{t("cv_instructor")}: <span className="font-medium text-foreground">{course.author_name}</span></p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Button size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={handleEnroll} disabled={enrolling}>
                {enrolling ? t("cv_enrolling") : `${t("cv_enroll")}${!course.is_free ? ` — $${Number(course.price).toFixed(2)}` : ""}`}
              </Button>
            ) : (
              <Button size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={() => navigate("/login", { state: { from: `/courses/${id}` } })}>
                <LogIn className="h-4 w-4 mr-2" />
                {t("cv_login_enroll")}
              </Button>
            )}
            <Button size="lg" variant="outline" onClick={() => navigate("/")}>{t("cv_back_home")}</Button>
          </div>

          {/* Preview lessons */}
          <div className="mt-12 text-left">
            <h2 className="text-xl font-semibold text-foreground mb-6">{t("cv_course_content")}</h2>
            {modules.map((mod) => (
              <div key={mod.id} className="mb-6">
                <h3 className="text-base font-medium text-foreground mb-3 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-secondary" /> {localized(mod, "title", lang)}
                </h3>
                <div className="space-y-2 pl-6">
                  {mod.lessons.map((lesson) => (
                    <div key={lesson.id} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-muted/30 text-sm">
                      {lesson.is_free_preview ? contentIcon(lesson.content_type) : <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                      <span className={lesson.is_free_preview ? "text-foreground" : "text-muted-foreground"}>{localized(lesson, "title", lang)}</span>
                      {lesson.is_free_preview && <Badge className="ml-auto text-xs bg-emerald-500/10 text-emerald-600 border-0">Preview</Badge>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- Course viewer (enrolled or free) ---
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="h-14 border-b border-border flex items-center px-4 gap-4 shrink-0 z-10 bg-background">
        <button onClick={() => setSidebarOpen((o) => !o)} className="text-muted-foreground hover:text-foreground transition-colors">
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <Link to="/" className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors text-sm">
          <ChevronLeft className="h-4 w-4" /> {t("cv_home")}
        </Link>
        <span className="text-muted-foreground">·</span>
        <h1 className="font-semibold text-foreground text-sm line-clamp-1 flex-1">{localized(course, "title", lang)}</h1>
        {enrolled && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground hidden sm:block">{progressPct}% {t("cv_completed_pct")}</span>
            <div className="w-24 hidden sm:block">
              <Progress value={progressPct} className="h-1.5" />
            </div>
          </div>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <aside className="w-72 border-r border-border bg-card overflow-y-auto shrink-0 hidden md:block">
            <div className="p-4">
              {enrolled && (
                <div className="mb-4 p-3 rounded-xl bg-secondary/10">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{t("cv_progress")}</span>
                    <span>{completedCount}/{allLessons.length} {t("cv_lessons")}</span>
                  </div>
                  <Progress value={progressPct} className="h-2" />
                </div>
              )}

              {modules.map((mod) => (
                <div key={mod.id} className="mb-4">
                  <button
                    onClick={() => setExpandedModules((prev) => {
                      const next = new Set(prev);
                      next.has(mod.id) ? next.delete(mod.id) : next.add(mod.id);
                      return next;
                    })}
                    className="w-full flex items-center justify-between text-left px-2 py-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-sm font-semibold text-foreground">{localized(mod, "title", lang)}</span>
                    <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${expandedModules.has(mod.id) ? "rotate-90" : ""}`} />
                  </button>

                  {expandedModules.has(mod.id) && (
                    <div className="mt-1 space-y-0.5">
                      {mod.lessons.map((lesson) => {
                        const canAccess = enrolled || course.is_free || lesson.is_free_preview;
                        const isActive = activeLesson?.id === lesson.id;
                        return (
                          <button
                            key={lesson.id}
                            onClick={() => selectLesson(lesson)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors text-sm ${
                              isActive
                                ? "bg-secondary/10 text-secondary font-medium"
                                : canAccess
                                ? "hover:bg-muted/50 text-foreground"
                                : "text-muted-foreground cursor-not-allowed"
                            }`}
                          >
                            {completedIds.has(lesson.id) ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                            ) : canAccess ? (
                              <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                            ) : (
                              <Lock className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                            )}
                            <span className="line-clamp-2 flex-1">{localized(lesson, "title", lang)}</span>
                            <span className="text-muted-foreground ml-auto shrink-0">{contentIcon(lesson.content_type)}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </aside>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          {activeLesson ? (
            <motion.div
              key={activeLesson.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl mx-auto px-4 sm:px-8 py-8"
            >
              {/* Video */}
              {activeLesson.content_type === "video" && activeLesson.video_url && (
                <div className="mb-8 rounded-2xl overflow-hidden bg-black aspect-video">
                  {getYouTubeId(activeLesson.video_url) ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${getYouTubeId(activeLesson.video_url)}`}
                      className="w-full h-full"
                      allowFullScreen
                      title={activeLesson.title}
                    />
                  ) : (
                    <video src={activeLesson.video_url} controls className="w-full h-full" />
                  )}
                </div>
              )}

              {/* PDF */}
              {activeLesson.content_type === "pdf" && activeLesson.pdf_url && (
                <div className="mb-8">
                  <iframe src={activeLesson.pdf_url} className="w-full h-[70vh] rounded-2xl border border-border" title={activeLesson.title} />
                </div>
              )}

              {/* Lesson header */}
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-display font-bold text-foreground">{localized(activeLesson, "title", lang)}</h2>
                  {activeLesson.duration_minutes && (
                    <p className="text-sm text-muted-foreground mt-1">{activeLesson.duration_minutes} {t("cv_reading_min")}</p>
                  )}
                </div>
                {user && (enrolled || course?.is_free) && !completedIds.has(activeLesson.id) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 shrink-0"
                    onClick={() => markCompleted(activeLesson.id, modules)}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    {t("cv_mark_complete")}
                  </Button>
                )}
                {completedIds.has(activeLesson.id) && (
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-0 shrink-0">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> {t("cv_completed_label")}
                  </Badge>
                )}
              </div>

              {/* Text content */}
              {(activeLesson.content_text || activeLesson.content_text_pt) && (
                <div className="prose prose-sm max-w-none text-foreground bg-card rounded-2xl p-6 border border-border">
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{localized(activeLesson, "content_text", lang)}</pre>
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between mt-10 pt-6 border-t border-border">
                <Button
                  variant="outline"
                  disabled={!prevLesson}
                  onClick={() => prevLesson && selectLesson(prevLesson)}
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:block">{t("cv_prev")}</span>
                </Button>

                <span className="text-xs text-muted-foreground">
                  {currentIndex + 1} / {allLessons.length}
                </span>

                <Button
                  disabled={!nextLesson}
                  onClick={() => {
                    if (user && (enrolled || course?.is_free) && !completedIds.has(activeLesson.id)) markCompleted(activeLesson.id, modules);
                    if (nextLesson) selectLesson(nextLesson);
                  }}
                  className="flex items-center gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90"
                >
                  <span className="hidden sm:block">{t("cv_next")}</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">{t("cv_select_lesson")}</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Mobile enroll CTA */}
      {!enrolled && !course.is_free && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
          <Button className="w-full bg-secondary text-secondary-foreground" onClick={handleEnroll} disabled={enrolling}>
            {enrolling ? t("cv_enrolling") : t("cv_enroll_mobile")}
          </Button>
        </div>
      )}

      {/* 🎉 Course Completion Modal */}
      <AnimatePresence>
        {showCompletionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowCompletionModal(false)}
          >
            <motion.div
              initial={{ scale: 0.7, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{ type: "spring", bounce: 0.4 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-3xl p-8 max-w-md w-full text-center shadow-2xl relative overflow-hidden"
            >
              {/* Decorative background glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 via-transparent to-primary/10 pointer-events-none" />

              {/* Trophy animation */}
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring", bounce: 0.6 }}
                className="w-24 h-24 rounded-full bg-secondary/20 flex items-center justify-center mx-auto mb-6"
              >
                <Trophy className="h-12 w-12 text-secondary" />
              </motion.div>

              {/* Stars */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="flex justify-center gap-1 mb-4"
              >
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4 + i * 0.08, type: "spring", bounce: 0.5 }}
                  >
                    <Star className="h-5 w-5 text-secondary fill-current" />
                  </motion.div>
                ))}
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-2xl font-display font-bold text-foreground mb-2"
              >
                {t("cv_congrats")}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-muted-foreground mb-2"
              >
                {t("cv_course_done")}
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.65 }}
                className="font-semibold text-foreground mb-6"
              >
                {localized(course, "title", lang)}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.75 }}
                className="flex flex-col sm:flex-row gap-3"
              >
                <Button
                  className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  onClick={() => { setShowCompletionModal(false); navigate("/dashboard"); }}
                >
                  {t("cv_view_panel")}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowCompletionModal(false)}
                >
                  {t("cv_keep_reviewing")}
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CourseViewer;
