import { Button } from "@/components/ui/button";
import { ArrowRight, Play, TrendingUp, Users, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import heroBg from "@/assets/hero-bg.jpg";

const stats = [
  { icon: BookOpen, value: "150+", label: "Cursos" },
  { icon: Users, value: "25K+", label: "Estudiantes" },
  { icon: TrendingUp, value: "95%", label: "Satisfacción" },
];

const HeroSection = () => {
  return (
    <section id="hero" className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img src={heroBg} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-navy-dark/95 via-navy/85 to-navy/60" />
      </div>

      <div className="container mx-auto px-4 lg:px-8 relative z-10 pt-24 pb-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold/15 text-gold text-sm font-medium mb-6">
              <TrendingUp className="h-4 w-4" />
              Plataforma #1 en Educación Financiera
            </span>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-primary-foreground leading-tight mb-6">
              Domina tus{" "}
              <span className="text-gold">finanzas</span>,{" "}
              transforma tu{" "}
              <span className="text-gold">futuro</span>
            </h1>

            <p className="text-lg text-primary-foreground/70 mb-8 max-w-lg leading-relaxed">
              Aprende de expertos en inversiones, ahorro inteligente y educación financiera. 
              Cursos en video, PDFs descargables y contenido práctico para alcanzar tu libertad financiera.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Link to="/register">
                <Button size="lg" className="bg-gold text-navy-dark hover:bg-gold-dark font-semibold text-base px-8 gap-2">
                  Comenzar Gratis <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="border-primary-foreground/20 text-primary-foreground hover:bg-navy-light/50 gap-2"
              >
                <Play className="h-5 w-5" /> Ver Demo
              </Button>
            </div>

            {/* Stats */}
            <div className="flex gap-8">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <stat.icon className="h-5 w-5 text-gold mx-auto mb-1" />
                  <div className="text-2xl font-bold text-primary-foreground">{stat.value}</div>
                  <div className="text-xs text-primary-foreground/50">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right - floating cards */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="hidden lg:flex flex-col items-center gap-6"
          >
            <div className="animate-float bg-card/10 backdrop-blur-sm rounded-2xl border border-primary-foreground/10 p-6 w-72">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-gold/20 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-gold" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-primary-foreground">Inversiones 101</div>
                  <div className="text-xs text-primary-foreground/50">12 lecciones</div>
                </div>
              </div>
              <div className="w-full bg-navy-light/50 rounded-full h-2">
                <div className="bg-gold h-2 rounded-full w-3/4" />
              </div>
            </div>

            <div className="animate-float [animation-delay:1s] bg-card/10 backdrop-blur-sm rounded-2xl border border-primary-foreground/10 p-6 w-72 ml-16">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-gold/20 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-gold" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-primary-foreground">Ahorro Inteligente</div>
                  <div className="text-xs text-primary-foreground/50">8 lecciones</div>
                </div>
              </div>
              <div className="w-full bg-navy-light/50 rounded-full h-2">
                <div className="bg-gold h-2 rounded-full w-1/2" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
