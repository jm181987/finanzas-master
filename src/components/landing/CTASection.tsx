import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const CTASection = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative rounded-3xl bg-gradient-to-br from-navy via-navy-light to-navy overflow-hidden p-10 md:p-16 text-center"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-gold/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gold/10 rounded-full blur-3xl" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold/15 text-gold text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              Comienza tu transformación hoy
            </div>

            <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-primary-foreground mb-6 max-w-2xl mx-auto">
              Tu libertad financiera está a un{" "}
              <span className="text-gold">curso de distancia</span>
            </h2>

            <p className="text-primary-foreground/70 text-lg mb-8 max-w-lg mx-auto">
              Únete a miles de estudiantes que ya están transformando su futuro financiero con nuestros cursos.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button size="lg" className="bg-gold text-navy-dark hover:bg-gold-dark font-semibold text-base px-8 gap-2">
                  Crear Cuenta Gratis <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="border-primary-foreground/20 text-primary-foreground hover:bg-navy-light/50">
                Explorar Cursos
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
