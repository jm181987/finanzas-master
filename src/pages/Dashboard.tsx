import { useAuth } from "@/hooks/useAuth";
import { BookOpen, TrendingUp, Award, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const Dashboard = () => {
  const { user, role } = useAuth();

  const stats = [
    { icon: BookOpen, label: "Cursos Inscritos", value: "0" },
    { icon: TrendingUp, label: "En Progreso", value: "0" },
    { icon: Award, label: "Completados", value: "0" },
    { icon: Clock, label: "Horas de Estudio", value: "0h" },
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

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {stats.map((stat) => (
              <Card key={stat.label} className="border-border">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                  <stat.icon className="h-5 w-5 text-gold" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-display">Mis Cursos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-gold/40" />
                <p className="text-lg font-medium">Aún no estás inscrito en ningún curso</p>
                <p className="text-sm mt-1">Explora nuestro catálogo y comienza tu aprendizaje</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
