import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Pencil, Trash2, GripVertical,
  Video, FileText, AlignLeft, ChevronDown, ChevronRight, Upload,
} from "lucide-react";

interface Course { id: string; title: string; }
interface Module { id: string; course_id: string; title: string; description: string | null; sort_order: number; }
interface Lesson {
  id: string; module_id: string; title: string;
  content_type: string; content_text: string | null;
  video_url: string | null; pdf_url: string | null;
  sort_order: number; duration_minutes: number; is_free_preview: boolean;
}

const contentTypeIcon = { video: Video, pdf: FileText, text: AlignLeft };
const contentTypeLabel = { video: "Video", pdf: "PDF", text: "Texto" };

const EMPTY_LESSON = {
  title: "", content_type: "video", content_text: "", video_url: "", pdf_url: "",
  duration_minutes: 0, is_free_preview: false,
};

const AdminCourseContent = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Record<string, Lesson[]>>({});
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Module dialog
  const [moduleDialog, setModuleDialog] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [moduleForm, setModuleForm] = useState({ title: "", description: "" });
  const [savingModule, setSavingModule] = useState(false);

  // Lesson dialog
  const [lessonDialog, setLessonDialog] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [activeModuleId, setActiveModuleId] = useState<string>("");
  const [lessonForm, setLessonForm] = useState({ ...EMPTY_LESSON });
  const [savingLesson, setSavingLesson] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  // Fetch course + modules + lessons
  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: courseData } = await supabase.from("courses").select("id, title").eq("id", id).single();
      setCourse(courseData);

      const { data: modulesData } = await supabase
        .from("modules").select("*").eq("course_id", id).order("sort_order");
      const mods = modulesData || [];
      setModules(mods);
      setExpandedModules(new Set(mods.map((m) => m.id)));

      if (mods.length > 0) {
        const moduleIds = mods.map((m) => m.id);
        const { data: lessonsData } = await supabase
          .from("lessons").select("*").in("module_id", moduleIds).order("sort_order");
        const grouped: Record<string, Lesson[]> = {};
        for (const mod of mods) grouped[mod.id] = [];
        for (const lesson of lessonsData || []) {
          if (!grouped[lesson.module_id]) grouped[lesson.module_id] = [];
          grouped[lesson.module_id].push(lesson);
        }
        setLessons(grouped);
      }
    } catch (err) {
      console.error(err);
      toast.error("Error al cargar el curso");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  // --- Module CRUD ---
  const openAddModule = () => {
    setEditingModule(null);
    setModuleForm({ title: "", description: "" });
    setModuleDialog(true);
  };
  const openEditModule = (mod: Module) => {
    setEditingModule(mod);
    setModuleForm({ title: mod.title, description: mod.description || "" });
    setModuleDialog(true);
  };
  const saveModule = async () => {
    if (!moduleForm.title.trim()) { toast.error("El título es obligatorio"); return; }
    setSavingModule(true);
    try {
      if (editingModule) {
        await supabase.from("modules").update({ title: moduleForm.title, description: moduleForm.description || null }).eq("id", editingModule.id);
        toast.success("Módulo actualizado");
      } else {
        const sort_order = modules.length;
        await supabase.from("modules").insert({ course_id: id!, title: moduleForm.title, description: moduleForm.description || null, sort_order });
        toast.success("Módulo creado");
      }
      setModuleDialog(false);
      fetchData();
    } catch { toast.error("Error al guardar módulo"); }
    finally { setSavingModule(false); }
  };
  const deleteModule = async (modId: string) => {
    if (!confirm("¿Eliminar este módulo y todas sus lecciones?")) return;
    await supabase.from("modules").delete().eq("id", modId);
    toast.success("Módulo eliminado");
    fetchData();
  };

  // --- Lesson CRUD ---
  const openAddLesson = (modId: string) => {
    setEditingLesson(null);
    setActiveModuleId(modId);
    setLessonForm({ ...EMPTY_LESSON });
    setLessonDialog(true);
  };
  const openEditLesson = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setActiveModuleId(lesson.module_id);
    setLessonForm({
      title: lesson.title, content_type: lesson.content_type,
      content_text: lesson.content_text || "", video_url: lesson.video_url || "",
      pdf_url: lesson.pdf_url || "", duration_minutes: lesson.duration_minutes,
      is_free_preview: lesson.is_free_preview,
    });
    setLessonDialog(true);
  };
  const deleteLesson = async (lessonId: string, modId: string) => {
    if (!confirm("¿Eliminar esta lección?")) return;
    await supabase.from("lessons").delete().eq("id", lessonId);
    toast.success("Lección eliminada");
    setLessons((prev) => ({ ...prev, [modId]: prev[modId].filter((l) => l.id !== lessonId) }));
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") { toast.error("Solo se permiten archivos PDF"); return; }
    setUploadingPdf(true);
    try {
      const path = `courses/${id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("course-files").upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("course-files").getPublicUrl(path);
      setLessonForm((f) => ({ ...f, pdf_url: urlData.publicUrl }));
      toast.success("PDF subido correctamente");
    } catch { toast.error("Error al subir PDF"); }
    finally { setUploadingPdf(false); }
  };

  const saveLesson = async () => {
    if (!lessonForm.title.trim()) { toast.error("El título es obligatorio"); return; }
    setSavingLesson(true);
    try {
      const payload = {
        title: lessonForm.title.trim(),
        content_type: lessonForm.content_type,
        content_text: lessonForm.content_type === "text" ? lessonForm.content_text || null : null,
        video_url: lessonForm.content_type === "video" ? lessonForm.video_url || null : null,
        pdf_url: lessonForm.content_type === "pdf" ? lessonForm.pdf_url || null : null,
        duration_minutes: Number(lessonForm.duration_minutes) || 0,
        is_free_preview: lessonForm.is_free_preview,
      };
      if (editingLesson) {
        await supabase.from("lessons").update(payload).eq("id", editingLesson.id);
        toast.success("Lección actualizada");
      } else {
        const sort_order = (lessons[activeModuleId] || []).length;
        await supabase.from("lessons").insert({ ...payload, module_id: activeModuleId, sort_order });
        toast.success("Lección creada");
      }
      setLessonDialog(false);
      fetchData();
    } catch { toast.error("Error al guardar lección"); }
    finally { setSavingLesson(false); }
  };

  const toggleExpand = (modId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      next.has(modId) ? next.delete(modId) : next.add(modId);
      return next;
    });
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin h-8 w-8 border-4 border-secondary border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/courses")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-foreground">{course?.title}</h2>
          <p className="text-muted-foreground text-sm">Contenido del curso — módulos y lecciones</p>
        </div>
        <div className="ml-auto">
          <Button onClick={openAddModule}>
            <Plus className="h-4 w-4 mr-2" /> Nuevo Módulo
          </Button>
        </div>
      </div>

      {/* Modules list */}
      {modules.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground mb-4">Este curso no tiene módulos todavía.</p>
            <Button onClick={openAddModule}><Plus className="h-4 w-4 mr-2" /> Crear primer módulo</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {modules.map((mod, modIdx) => {
            const modLessons = lessons[mod.id] || [];
            const isExpanded = expandedModules.has(mod.id);
            return (
              <Card key={mod.id} className="border-border">
                {/* Module header */}
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    <button onClick={() => toggleExpand(mod.id)} className="flex items-center gap-2 flex-1 text-left">
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      <CardTitle className="text-base font-semibold font-sans">
                        Módulo {modIdx + 1}: {mod.title}
                      </CardTitle>
                      <Badge variant="outline" className="ml-2 text-xs">{modLessons.length} lección{modLessons.length !== 1 ? "es" : ""}</Badge>
                    </button>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => openEditModule(mod)}>
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteModule(mod.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  {mod.description && <p className="text-sm text-muted-foreground ml-10">{mod.description}</p>}
                </CardHeader>

                {/* Lessons list */}
                {isExpanded && (
                  <CardContent className="pt-0 pb-3 px-4">
                    <Separator className="mb-3" />
                    {modLessons.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {modLessons.map((lesson, lessonIdx) => {
                          const Icon = contentTypeIcon[lesson.content_type as keyof typeof contentTypeIcon] || AlignLeft;
                          return (
                            <div key={lesson.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors group">
                              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                              <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="text-sm flex-1 font-medium">
                                {lessonIdx + 1}. {lesson.title}
                              </span>
                              <Badge variant="outline" className="text-xs capitalize">
                                {contentTypeLabel[lesson.content_type as keyof typeof contentTypeLabel]}
                              </Badge>
                              {lesson.is_free_preview && (
                                <Badge variant="secondary" className="text-xs">Preview</Badge>
                              )}
                              {lesson.duration_minutes > 0 && (
                                <span className="text-xs text-muted-foreground">{lesson.duration_minutes} min</span>
                              )}
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditLesson(lesson)}>
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteLesson(lesson.id, mod.id)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <Button variant="outline" size="sm" onClick={() => openAddLesson(mod.id)} className="w-full border-dashed">
                      <Plus className="h-3.5 w-3.5 mr-2" /> Agregar lección
                    </Button>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Module Dialog */}
      <Dialog open={moduleDialog} onOpenChange={setModuleDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingModule ? "Editar Módulo" : "Nuevo Módulo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Título del módulo *</Label>
              <Input value={moduleForm.title} onChange={(e) => setModuleForm((f) => ({ ...f, title: e.target.value }))} placeholder="Ej: Introducción a las Inversiones" />
            </div>
            <div className="space-y-1.5">
              <Label>Descripción <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <Textarea value={moduleForm.description} onChange={(e) => setModuleForm((f) => ({ ...f, description: e.target.value }))} rows={2} placeholder="Describe brevemente este módulo..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModuleDialog(false)}>Cancelar</Button>
            <Button onClick={saveModule} disabled={savingModule}>{savingModule ? "Guardando..." : editingModule ? "Guardar cambios" : "Crear módulo"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lesson Dialog */}
      <Dialog open={lessonDialog} onOpenChange={setLessonDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLesson ? "Editar Lección" : "Nueva Lección"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Title */}
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input value={lessonForm.title} onChange={(e) => setLessonForm((f) => ({ ...f, title: e.target.value }))} placeholder="Ej: ¿Qué es una acción?" />
            </div>

            {/* Content type */}
            <div className="space-y-1.5">
              <Label>Tipo de contenido</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["video", "pdf", "text"] as const).map((type) => {
                  const Icon = contentTypeIcon[type];
                  return (
                    <button
                      key={type}
                      onClick={() => setLessonForm((f) => ({ ...f, content_type: type }))}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-md border transition-colors ${lessonForm.content_type === type ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-muted-foreground"}`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-xs font-medium">{contentTypeLabel[type]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content fields by type */}
            {lessonForm.content_type === "video" && (
              <div className="space-y-1.5">
                <Label>URL del video <span className="text-muted-foreground text-xs">(YouTube o Vimeo)</span></Label>
                <Input value={lessonForm.video_url} onChange={(e) => setLessonForm((f) => ({ ...f, video_url: e.target.value }))} placeholder="https://www.youtube.com/watch?v=..." />
              </div>
            )}

            {lessonForm.content_type === "pdf" && (
              <div className="space-y-1.5">
                <Label>Archivo PDF</Label>
                {lessonForm.pdf_url ? (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                    <FileText className="h-4 w-4 text-secondary" />
                    <span className="text-sm text-muted-foreground flex-1 truncate">{lessonForm.pdf_url.split("/").pop()}</span>
                    <Button variant="ghost" size="sm" onClick={() => setLessonForm((f) => ({ ...f, pdf_url: "" }))}>Cambiar</Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-border rounded-md cursor-pointer hover:border-muted-foreground transition-colors">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{uploadingPdf ? "Subiendo..." : "Haz clic para subir un PDF"}</span>
                    <input type="file" accept=".pdf" className="hidden" onChange={handlePdfUpload} disabled={uploadingPdf} />
                  </label>
                )}
              </div>
            )}

            {lessonForm.content_type === "text" && (
              <div className="space-y-1.5">
                <Label>Contenido de la lección</Label>
                <Textarea
                  value={lessonForm.content_text}
                  onChange={(e) => setLessonForm((f) => ({ ...f, content_text: e.target.value }))}
                  rows={8}
                  placeholder="Escribe aquí el contenido completo de la lección..."
                />
              </div>
            )}

            {/* Duration & Preview */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Duración (minutos)</Label>
                <Input type="number" min="0" value={lessonForm.duration_minutes} onChange={(e) => setLessonForm((f) => ({ ...f, duration_minutes: Number(e.target.value) }))} />
              </div>
              <div className="flex items-end gap-3 pb-1">
                <Switch id="free_preview" checked={lessonForm.is_free_preview} onCheckedChange={(v) => setLessonForm((f) => ({ ...f, is_free_preview: v }))} />
                <Label htmlFor="free_preview">Vista previa gratis</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLessonDialog(false)}>Cancelar</Button>
            <Button onClick={saveLesson} disabled={savingLesson || uploadingPdf}>
              {savingLesson ? "Guardando..." : editingLesson ? "Guardar cambios" : "Crear lección"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCourseContent;
