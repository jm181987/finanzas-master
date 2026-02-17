import { motion } from "framer-motion";
import { TrendingUp, PiggyBank, CreditCard, BookOpen, Wrench, Brain } from "lucide-react";

const categories = [
  { icon: TrendingUp, name: "Inversiones", description: "Aprende a invertir en bolsa, criptomonedas y bienes raíces", count: 24 },
  { icon: PiggyBank, name: "Ahorro Inteligente", description: "Estrategias probadas para maximizar tu ahorro", count: 18 },
  { icon: CreditCard, name: "Créditos", description: "Maneja tus deudas y usa el crédito a tu favor", count: 15 },
  { icon: BookOpen, name: "Educación Financiera", description: "Fundamentos para una vida financiera saludable", count: 32 },
  { icon: Wrench, name: "Herramientas", description: "Excel, apps y herramientas para gestionar tu dinero", count: 12 },
  { icon: Brain, name: "Mentalidad del Dinero", description: "Psicología financiera y hábitos de riqueza", count: 20 },
];

const CategoriesSection = () => {
  return (
    <section id="categorias" className="py-20 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <span className="text-sm font-semibold text-gold uppercase tracking-wider">Explora por Categoría</span>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mt-3">
            Encuentra tu camino hacia la{" "}
            <span className="text-gold">libertad financiera</span>
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group p-6 rounded-2xl border border-border bg-card hover:border-gold/40 hover:shadow-lg hover:shadow-gold/5 transition-all duration-300 cursor-pointer"
            >
              <div className="h-12 w-12 rounded-xl bg-gold/10 flex items-center justify-center mb-4 group-hover:bg-gold/20 transition-colors">
                <cat.icon className="h-6 w-6 text-gold" />
              </div>
              <h3 className="text-lg font-semibold text-card-foreground mb-2">{cat.name}</h3>
              <p className="text-sm text-muted-foreground mb-3">{cat.description}</p>
              <span className="text-xs font-medium text-gold">{cat.count} cursos</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
