import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const CTASection = () => {
  const { user } = useAuth();
  return (
    <section className="py-12 sm:py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-br from-navy via-navy-light to-navy overflow-hidden p-8 sm:p-10 md:p-16 text-center"
        >
          <div className="absolute top-0 right-0 w-48 sm:w-64 h-48 sm:h-64 bg-gold/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-36 sm:w-48 h-36 sm:h-48 bg-gold/10 rounded-full blur-3xl" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold/15 text-gold text-xs sm:text-sm font-medium mb-4 sm:mb-6">
              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Comienza tu transformación hoy
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-display font-bold text-primary-foreground mb-4 sm:mb-6 max-w-2xl mx-auto">
              Tu libertad financiera está a un{" "}
              <span className="text-gold">curso de distancia</span>
            </h2>

            <p className="text-primary-foreground/70 text-base sm:text-lg mb-6 sm:mb-8 max-w-lg mx-auto">
              Únete a miles de estudiantes que ya están transformando su futuro financiero con nuestros cursos.
            </p>

            <div className="flex justify-center">
              <Link to={user ? "/courses" : "/register"} className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto bg-gold text-navy-dark hover:bg-gold-dark font-semibold text-base px-8 gap-2">
                  {user ? "Ver catálogo de cursos" : "Crear Cuenta Gratis"} <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
