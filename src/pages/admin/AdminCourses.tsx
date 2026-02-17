import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle, XCircle, Star, StarOff } from "lucide-react";

interface CourseRow {
  id: string;
  title: string;
  status: string;
  is_published: boolean;
  is_featured: boolean;
  is_free: boolean;
  price: number;
  created_at: string;
  author_id: string;
  author_name?: string;
}

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
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, status, is_published, is_featured, is_free, price, created_at, author_id")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch author names
      const authorIds = [...new Set((data || []).map((c) => c.author_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", authorIds);

      const nameMap = new Map((profiles || []).map((p) => [p.id, p.full_name]));

      setCourses(
        (data || []).map((c) => ({
          ...c,
          author_name: nameMap.get(c.author_id) || "Desconocido",
        }))
      );
    } catch (err) {
      console.error(err);
      toast.error("Error al cargar cursos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const updateCourse = async (id: string, updates: Record<string, unknown>) => {
    try {
      const { error } = await supabase.from("courses").update(updates).eq("id", id);
      if (error) throw error;
      toast.success("Curso actualizado");
      setCourses((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updates } as CourseRow : c))
      );
    } catch (err) {
      console.error(err);
      toast.error("Error al actualizar curso");
    }
  };

  const approve = (id: string) => updateCourse(id, { status: "approved", is_published: true });
  const reject = (id: string) => updateCourse(id, { status: "rejected", is_published: false });
  const toggleFeatured = (id: string, current: boolean) => updateCourse(id, { is_featured: !current });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">Gestión de Cursos</h2>
        <p className="text-muted-foreground">Aprueba, rechaza y destaca cursos</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-sans text-lg">Todos los Cursos ({courses.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Autor</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Destacado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {course.title}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{course.author_name}</TableCell>
                    <TableCell>
                      {course.is_free ? (
                        <Badge variant="secondary">Gratis</Badge>
                      ) : (
                        <span className="font-medium">${Number(course.price).toFixed(2)}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[course.status]}>
                        {statusLabels[course.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleFeatured(course.id, course.is_featured)}
                        title={course.is_featured ? "Quitar destacado" : "Destacar"}
                      >
                        {course.is_featured ? (
                          <Star className="h-4 w-4 fill-secondary text-secondary" />
                        ) : (
                          <StarOff className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {course.status !== "approved" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => approve(course.id)}
                            title="Aprobar"
                            className="text-emerald-600 hover:text-emerald-700"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {course.status !== "rejected" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => reject(course.id)}
                            title="Rechazar"
                            className="text-destructive hover:text-destructive"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCourses;
