import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
}

const AdminCategories = () => {
  const { t } = useLanguage();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const fetchCategories = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("categories").select("*").order("name");
    if (error) {
      toast.error(t("admin_cat_load_error"));
    } else {
      setCategories(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);

  const addCategory = async () => {
    if (!newName.trim()) return;
    const slug = newName.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const { error } = await supabase.from("categories").insert({ name: newName.trim(), slug });
    if (error) {
      toast.error(t("admin_cat_create_error"));
    } else {
      toast.success(t("admin_cat_created"));
      setNewName("");
      fetchCategories();
    }
  };

  const updateCategory = async (id: string) => {
    if (!editName.trim()) return;
    const slug = editName.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const { error } = await supabase.from("categories").update({ name: editName.trim(), slug }).eq("id", id);
    if (error) {
      toast.error(t("admin_cat_update_error"));
    } else {
      toast.success(t("admin_cat_updated"));
      setEditingId(null);
      fetchCategories();
    }
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) {
      toast.error(t("admin_cat_delete_error"));
    } else {
      toast.success(t("admin_cat_deleted"));
      setCategories((prev) => prev.filter((c) => c.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">{t("admin_cat_title")}</h2>
        <p className="text-muted-foreground">{t("admin_cat_subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-sans text-lg">{t("admin_cat_add_title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              placeholder={t("admin_cat_placeholder")}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCategory()}
              className="max-w-sm"
            />
            <Button onClick={addCategory} disabled={!newName.trim()}>
              <Plus className="h-4 w-4 mr-2" /> {t("admin_cat_add_btn")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-sans text-lg">{t("admin_cat_list_title")} ({categories.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin_cat_col_name")}</TableHead>
                  <TableHead>{t("admin_cat_col_slug")}</TableHead>
                  <TableHead className="w-[120px]">{t("admin_cat_col_actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell>
                      {editingId === cat.id ? (
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && updateCategory(cat.id)}
                          className="max-w-xs"
                          autoFocus
                        />
                      ) : (
                        <span className="font-medium">{cat.name}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{cat.slug}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {editingId === cat.id ? (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => updateCategory(cat.id)}>
                              <Check className="h-4 w-4 text-emerald-600" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setEditingId(null)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => { setEditingId(cat.id); setEditName(cat.name); }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteCategory(cat.id)} className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCategories;
