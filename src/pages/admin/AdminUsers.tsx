import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Search, UserPlus, Pencil } from "lucide-react";

interface UserWithRole {
  id: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  role: "admin" | "developer" | "user";
  email?: string;
}

const roleBadgeVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  admin: "destructive",
  developer: "default",
  user: "secondary",
};

const roleLabels: Record<string, string> = {
  admin: "Admin",
  developer: "Desarrollador",
  user: "Usuario",
};

const emptyForm = { fullName: "", email: "", password: "", role: "user", bio: "" };

const AdminUsers = () => {
  const { role: currentRole, session } = useAuth();
  const canManage = currentRole === "admin" || currentRole === "developer";

  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, full_name, bio, avatar_url, created_at");
      if (pErr) throw pErr;

      const { data: roles, error: rErr } = await supabase
        .from("user_roles")
        .select("user_id, role");
      if (rErr) throw rErr;

      const roleMap = new Map(roles?.map((r) => [r.user_id, r.role]) || []);

      setUsers(
        (profiles || []).map((p) => ({
          ...p,
          role: (roleMap.get(p.id) as UserWithRole["role"]) || "user",
        }))
      );
    } catch (err) {
      console.error(err);
      toast.error("Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!canManage) return;
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole as UserWithRole["role"] })
        .eq("user_id", userId);
      if (error) throw error;
      toast.success("Rol actualizado");
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole as UserWithRole["role"] } : u));
    } catch (err) {
      toast.error("Error al actualizar rol");
    }
  };

  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = async (user: UserWithRole) => {
    setEditingUser(user);
    setForm({ fullName: user.full_name || "", email: "", password: "", role: user.role, bio: user.bio || "" });
    setModalOpen(true);
    // Fetch current email
    if (session) {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({ action: "get-user", userId: user.id }),
          }
        );
        const data = await res.json();
        if (data.email) setForm((f) => ({ ...f, email: data.email }));
      } catch (_) {}
    }
  };

  const handleSave = async () => {
    if (!session) return;
    if (!form.fullName.trim()) { toast.error("El nombre es requerido"); return; }
    if (!editingUser && (!form.email.trim() || !form.password.trim())) {
      toast.error("Email y contraseña son requeridos para crear usuario"); return;
    }
    setSaving(true);
    try {
      const body: Record<string, any> = {
        action: editingUser ? "edit" : "create",
        fullName: form.fullName,
        role: form.role,
        bio: form.bio,
      };
      if (editingUser) {
        body.userId = editingUser.id;
        if (form.email) body.email = form.email;
        if (form.password) body.password = form.password;
      } else {
        body.email = form.email;
        body.password = form.password;
      }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error desconocido");

      toast.success(editingUser ? "Usuario actualizado" : "Usuario creado correctamente");
      setModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const filtered = users.filter(
    (u) =>
      !search ||
      (u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-1">Gestión de Usuarios</h2>
          <p className="text-muted-foreground text-sm">Administra los usuarios y sus roles</p>
        </div>
        {canManage && (
          <Button onClick={openCreate} className="gap-2 w-full sm:w-auto">
            <UserPlus className="h-4 w-4" /> Agregar Usuario
          </Button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o rol..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-sans text-base sm:text-lg">Usuarios ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Rol Actual</TableHead>
                      <TableHead>Registrado</TableHead>
                      <TableHead>Cambiar Rol</TableHead>
                      {canManage && <TableHead>Acciones</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name || "Sin nombre"}</TableCell>
                        <TableCell>
                          <Badge variant={roleBadgeVariant[user.role]}>{roleLabels[user.role]}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString("es-ES")}
                        </TableCell>
                        <TableCell>
                          {canManage ? (
                            <Select value={user.role} onValueChange={(val) => handleRoleChange(user.id, val)}>
                              <SelectTrigger className="w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">Usuario</SelectItem>
                                <SelectItem value="developer">Desarrollador</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant={roleBadgeVariant[user.role]}>{roleLabels[user.role]}</Badge>
                          )}
                        </TableCell>
                        {canManage && (
                          <TableCell>
                            <Button size="sm" variant="outline" className="gap-1" onClick={() => openEdit(user)}>
                              <Pencil className="h-3.5 w-3.5" /> Editar
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={canManage ? 5 : 4} className="text-center text-muted-foreground py-8">
                          No se encontraron usuarios
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden space-y-3">
                {filtered.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">No se encontraron usuarios</p>
                ) : filtered.map((user) => (
                  <div key={user.id} className="border border-border rounded-xl p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-foreground text-sm">{user.full_name || "Sin nombre"}</p>
                        <p className="text-xs text-muted-foreground">{new Date(user.created_at).toLocaleDateString("es-ES")}</p>
                      </div>
                      <Badge variant={roleBadgeVariant[user.role]}>{roleLabels[user.role]}</Badge>
                    </div>
                    {canManage && (
                      <div className="flex gap-2">
                        <Select value={user.role} onValueChange={(val) => handleRoleChange(user.id, val)}>
                          <SelectTrigger className="flex-1 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">Usuario</SelectItem>
                            <SelectItem value="developer">Desarrollador</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button size="sm" variant="outline" className="gap-1 h-8 text-xs" onClick={() => openEdit(user)}>
                          <Pencil className="h-3 w-3" /> Editar
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Editar Usuario" : "Agregar Usuario"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nombre completo *</Label>
              <Input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} placeholder="Jorge Márquez" />
            </div>

            <div className="space-y-1.5">
              <Label>{editingUser ? "Email (editable)" : "Email *"}</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="correo@ejemplo.com" />
              {editingUser && <p className="text-xs text-muted-foreground">El email actual se carga automáticamente. Modifícalo si deseas cambiarlo.</p>}
            </div>

            <div className="space-y-1.5">
              <Label>{editingUser ? "Nueva contraseña (dejar vacío para no cambiar)" : "Contraseña *"}</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
            </div>

            <div className="space-y-1.5">
              <Label>Rol</Label>
              <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuario</SelectItem>
                  <SelectItem value="developer">Desarrollador</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Bio (opcional)</Label>
              <Textarea value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} placeholder="Descripción breve del usuario..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Guardando..." : editingUser ? "Guardar cambios" : "Crear usuario"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
