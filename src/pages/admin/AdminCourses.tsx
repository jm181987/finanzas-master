import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle, XCircle, Star, StarOff, Plus, Pencil, Trash2, LayoutList } from "lucide-react";

interface CourseRow {
  id: string;
  title: string;
  description: string | null;
  short_description: string | null;
  image_url: string | null;
  category_id: string | null;
  status: string;
  is_published: boolean;
  is_featured: boolean;
  is_free: boolean;
  price: number;
  created_at: string;
  author_id: string;
  author_name?: string;
}

interface Category {
  id: string;
  name: string;
}

interface CourseForm {
  title: string;
  description: string;
  short_description: string;
  image_url: string;
  category_id: string;
  price: string;
  is_free: boolean;
  status: string;
  is_published: boolean;
  is_featured: boolean;
}

const EMPTY_FORM: CourseForm = {
  title: "",
  description: "",
  short_description: "",
  image_url: "",
  category_id: "",
  price: "0",
  is_free: true,
  status: "draft",
  is_published: false,
  is_featured: false,
};

const statusLabels: Record<string, string> = {
  draft: "Borrador",
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
};

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
};

const AdminCourses = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseRow | null>(null);
  const [form, setForm] = useState<CourseForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, description, short_description, image_url, category_id, status, is_published, is_featured, is_free, price, created_at, author_id")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const authorIds = [...new Set((data || []).map((c) => c.author_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", authorIds);

      const nameMap = new Map((profiles || []).map((p) => [p.id, p.full_name]));
      setCourses((data || []).map((c) => ({ ...c, author_name: nameMap.get(c.author_id) || "Desconocido" })));
    } catch (err) {
      console.error(err);
      toast.error("Error al cargar cursos");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("id, name").order("name");
    setCategories(data || []);
  };

  useEffect(() => {
    fetchCourses();
    fetchCategories();
  }, []);

  const openCreate = () => {
    setEditingCourse(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (course: CourseRow) => {
    setEditingCourse(course);
    setForm({
      title: course.title,
      description: course.description || "",
      short_description: course.short_description || "",
      image_url: course.image_url || "",
      category_id: course.category_id || "",
      price: String(course.price),
      is_free: course.is_free,
      status: course.status,
      is_published: course.is_published,
      is_featured: course.is_featured,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("El título es obligatorio"); return; }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description || null,
        short_description: form.short_description || null,
        image_url: form.image_url || null,
        category_id: form.category_id || null,
        price: form.is_free ? 0 : parseFloat(form.price) || 0,
        is_free: form.is_free,
        status: form.status,
        is_published: form.is_published,
        is_featured: form.is_featured,
      };

      if (editingCourse) {
        const { error } = await supabase.from("courses").update(payload).eq("id", editingCourse.id);
        if (error) throw error;
        toast.success("Curso actualizado correctamente");
      } else {
        const { error } = await supabase.from("courses").insert({ ...payload, author_id: user!.id });
        if (error) throw error;
        toast.success("Curso creado correctamente");
      }
      setDialogOpen(false);
      fetchCourses();
    } catch (err: unknown) {
      console.error(err);
      toast.error("Error al guardar el curso");
    } finally {
      setSaving(false);
    }
  };

  const deleteCourse = async (id: string) => {
    if (!confirm("¿Seguro que quieres eliminar este curso?")) return;
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) { toast.error("Error al eliminar el curso"); return; }
    toast.success("Curso eliminado");
    setCourses((prev) => prev.filter((c) => c.id !== id));
  };

  const updateCourse = async (id: string, updates: Record<string, unknown>) => {
    const { error } = await supabase.from("courses").update(updates).eq("id", id);
    if (error) { toast.error("Error al actualizar curso"); return; }
    toast.success("Curso actualizado");
    setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } as CourseRow : c)));
  };

  const approve = (id: string) => updateCourse(id, { status: "approved", is_published: true });
  const reject = (id: string) => updateCourse(id, { status: "rejected", is_published: false });
  const toggleFeatured = (id: string, current: boolean) => updateCourse(id, { is_featured: !current });

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-1">Gestión de Cursos</h2>
          <p className="text-muted-foreground text-sm">Crea, aprueba, rechaza y destaca cursos</p>
        </div>
        <Button onClick={openCreate} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" /> Nuevo Curso
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-sans text-base sm:text-lg">Todos los Cursos ({courses.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Autor</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Dest.</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {courses.map((course) => (
                      <TableRow key={course.id}>
                        <TableCell className="font-medium max-w-[200px] truncate">{course.title}</TableCell>
                        <TableCell className="text-muted-foreground">{course.author_name}</TableCell>
                        <TableCell>
                          {course.is_free ? (
                            <Badge variant="secondary">Gratis</Badge>
                          ) : (
                            <span className="font-medium">${Number(course.price).toFixed(2)}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant[course.status]}>{statusLabels[course.status]}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => toggleFeatured(course.id, course.is_featured)}>
                            {course.is_featured
                              ? <Star className="h-4 w-4 fill-secondary text-secondary" />
                              : <StarOff className="h-4 w-4 text-muted-foreground" />}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/courses/${course.id}/content`)} title="Gestionar contenido">
                              <LayoutList className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openEdit(course)} title="Editar">
                              <Pencil className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            {course.status !== "approved" && (
                              <Button variant="ghost" size="icon" onClick={() => approve(course.id)} title="Aprobar" className="text-primary hover:text-primary/80">
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            {course.status !== "rejected" && (
                              <Button variant="ghost" size="icon" onClick={() => reject(course.id)} title="Rechazar" className="text-destructive hover:text-destructive">
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => deleteCourse(course.id)} title="Eliminar" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {courses.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No hay cursos registrados
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden space-y-3">
                {courses.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">No hay cursos registrados</p>
                ) : courses.map((course) => (
                  <div key={course.id} className="border border-border rounded-xl p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground text-sm line-clamp-2">{course.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">por {course.author_name}</p>
                      </div>
                      <Badge variant={statusVariant[course.status]} className="shrink-0 text-xs">{statusLabels[course.status]}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">
                        {course.is_free ? <Badge variant="secondary">Gratis</Badge> : <span className="font-medium">${Number(course.price).toFixed(2)}</span>}
                      </span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleFeatured(course.id, course.is_featured)}>
                          {course.is_featured ? <Star className="h-4 w-4 fill-secondary text-secondary" /> : <StarOff className="h-4 w-4 text-muted-foreground" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/admin/courses/${course.id}/content`)}>
                          <LayoutList className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(course)}>
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        {course.status !== "approved" && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => approve(course.id)}>
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {course.status !== "rejected" && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => reject(course.id)}>
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteCourse(course.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCourse ? "Editar Curso" : "Nuevo Curso"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Ej: Inversión en Bolsa desde Cero"
              />
            </div>

            {/* Short description */}
            <div className="space-y-1.5">
              <Label htmlFor="short_desc">Descripción corta</Label>
              <Input
                id="short_desc"
                value={form.short_description}
                onChange={(e) => setForm((f) => ({ ...f, short_description: e.target.value }))}
                placeholder="Resumen breve del curso (aparece en el catálogo)"
              />
            </div>

            {/* Full description */}
            <div className="space-y-1.5">
              <Label htmlFor="description">Descripción completa</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Descripción detallada del contenido del curso..."
                rows={4}
              />
            </div>

            {/* Image URL */}
            <div className="space-y-1.5">
              <Label htmlFor="image_url">URL de imagen</Label>
              <Input
                id="image_url"
                value={form.image_url}
                onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                placeholder="https://..."
              />
              {form.image_url && (
                <img src={form.image_url} alt="Preview" className="mt-2 h-28 w-full object-cover rounded-md border border-border" onError={(e) => (e.currentTarget.style.display = "none")} />
              )}
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <Select value={form.category_id} onValueChange={(v) => setForm((f) => ({ ...f, category_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Price & Free */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Precio (USD)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  disabled={form.is_free}
                />
              </div>
              <div className="flex items-end gap-3 pb-1">
                <Switch
                  id="is_free"
                  checked={form.is_free}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, is_free: v, price: v ? "0" : f.price }))}
                />
                <Label htmlFor="is_free">Curso gratuito</Label>
              </div>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Borrador</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="approved">Aprobado</SelectItem>
                  <SelectItem value="rejected">Rechazado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Toggles */}
            <div className="flex gap-8 pt-1">
              <div className="flex items-center gap-3">
                <Switch
                  id="is_published"
                  checked={form.is_published}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, is_published: v }))}
                />
                <Label htmlFor="is_published">Publicado</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="is_featured"
                  checked={form.is_featured}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, is_featured: v }))}
                />
                <Label htmlFor="is_featured">Destacado</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Guardando..." : editingCourse ? "Guardar cambios" : "Crear curso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCourses;
