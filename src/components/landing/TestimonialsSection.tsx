import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const testimonials = [
  {
    name: "María López",
    role: "Emprendedora",
    text: "Gracias a FinanzasMaster aprendí a invertir de forma inteligente. En 6 meses duplique mis ahorros siguiendo las estrategias del curso de inversiones.",
    rating: 5,
    initials: "ML",
  },
  {
    name: "Juan Pérez",
    role: "Ingeniero de Software",
    text: "Los cursos son claros, prácticos y van directo al punto. El material en PDF es excelente como referencia. Lo recomiendo al 100%.",
    rating: 5,
    initials: "JP",
  },
  {
    name: "Sofia Ramírez",
    role: "Freelancer",
    text: "Pasé de no saber nada sobre finanzas a tener un portafolio de inversiones diversificado. La mejor inversión que he hecho es en mi educación financiera.",
    rating: 5,
    initials: "SR",
  },
];

const TestimonialsSection = () => {
  return (
    <section id="testimonios" className="py-12 sm:py-20 bg-navy relative overflow-hidden">
      <div className="absolute top-0 left-0 w-48 sm:w-72 h-48 sm:h-72 bg-gold/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-64 sm:w-96 h-64 sm:h-96 bg-gold/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10 sm:mb-14"
        >
          <span className="text-sm font-semibold text-gold uppercase tracking-wider">Testimonios</span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-primary-foreground mt-3">
            Lo que dicen nuestros <span className="text-gold">estudiantes</span>
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-8">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="bg-navy-light/40 backdrop-blur-sm border border-primary-foreground/10 rounded-2xl p-6"
            >
              <Quote className="h-8 w-8 text-gold/30 mb-4" />
              <p className="text-primary-foreground/80 text-sm leading-relaxed mb-6">"{t.text}"</p>
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 text-gold fill-current" />
                ))}
              </div>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 bg-gold/20">
                  <AvatarFallback className="bg-gold/20 text-gold text-sm font-semibold">
                    {t.initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-sm font-semibold text-primary-foreground">{t.name}</div>
                  <div className="text-xs text-primary-foreground/50">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
