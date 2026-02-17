import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, DollarSign, GraduationCap } from "lucide-react";

interface Metrics {
  totalUsers: number;
  totalCourses: number;
  totalRevenue: number;
  totalEnrollments: number;
}

const AdminDashboard = () => {
  const [metrics, setMetrics] = useState<Metrics>({
    totalUsers: 0,
    totalCourses: 0,
    totalRevenue: 0,
    totalEnrollments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const [usersRes, coursesRes, enrollmentsRes, paymentsRes] = await Promise.all([
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("courses").select("id", { count: "exact", head: true }),
          supabase.from("enrollments").select("id", { count: "exact", head: true }),
          supabase.from("payments").select("amount").eq("status", "completed"),
        ]);

        const totalRevenue = (paymentsRes.data || []).reduce(
          (sum, p) => sum + Number(p.amount),
          0
        );

        setMetrics({
          totalUsers: usersRes.count || 0,
          totalCourses: coursesRes.count || 0,
          totalEnrollments: enrollmentsRes.count || 0,
          totalRevenue,
        });
      } catch (error) {
        console.error("Error fetching metrics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  const cards = [
    { label: "Usuarios Totales", value: metrics.totalUsers, icon: Users, color: "text-blue-500" },
    { label: "Cursos Publicados", value: metrics.totalCourses, icon: BookOpen, color: "text-emerald-500" },
    { label: "Inscripciones", value: metrics.totalEnrollments, icon: GraduationCap, color: "text-purple-500" },
    { label: "Ingresos Totales", value: `$${metrics.totalRevenue.toFixed(2)}`, icon: DollarSign, color: "text-secondary" },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2"><div className="h-4 bg-muted rounded w-24" /></CardHeader>
            <CardContent><div className="h-8 bg-muted rounded w-16" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-1">Dashboard</h2>
        <p className="text-muted-foreground text-sm sm:text-base">Resumen general de la plataforma</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-6 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground font-sans leading-tight">
                {card.label}
              </CardTitle>
              <card.icon className={`h-4 w-4 sm:h-5 sm:w-5 shrink-0 ${card.color}`} />
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-2xl sm:text-3xl font-bold text-foreground font-sans">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
