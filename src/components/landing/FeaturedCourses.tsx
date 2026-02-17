import { motion } from "framer-motion";
import { Star, Clock, Users, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const courses = [
  {
    title: "Inversiones para Principiantes",
    author: "Carlos Mendoza",
    category: "Inversiones",
    rating: 4.8,
    students: 3420,
    lessons: 24,
    price: 0,
    image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=250&fit=crop",
  },
  {
    title: "Domina tus Finanzas Personales",
    author: "Ana García",
    category: "Educación Financiera",
    rating: 4.9,
    students: 5210,
    lessons: 18,
    price: 49.99,
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=250&fit=crop",
  },
  {
    title: "Ahorro e Inversión Inteligente",
    author: "Roberto Díaz",
    category: "Ahorro Inteligente",
    rating: 4.7,
    students: 2890,
    lessons: 15,
    price: 39.99,
    image: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=400&h=250&fit=crop",
  },
  {
    title: "Mentalidad Millonaria",
    author: "Laura Torres",
    category: "Mentalidad del Dinero",
    rating: 4.6,
    students: 4100,
    lessons: 12,
    price: 0,
    image: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=400&h=250&fit=crop",
  },
];

const FeaturedCourses = () => {
  return (
    <section id="cursos" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <span className="text-sm font-semibold text-gold uppercase tracking-wider">Cursos Destacados</span>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mt-3">
            Aprende de los <span className="text-gold">mejores expertos</span>
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {courses.map((course, i) => (
            <motion.div
              key={course.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group rounded-2xl overflow-hidden bg-card border border-border hover:shadow-xl hover:shadow-gold/5 transition-all duration-300"
            >
              {/* Image */}
              <div className="relative h-44 overflow-hidden">
                <img
                  src={course.image}
                  alt={course.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-dark/60 to-transparent" />
                <div className="absolute top-3 left-3">
                  <Badge className={course.price === 0 ? "bg-green-500/90 text-white border-0" : "bg-gold text-navy-dark border-0"}>
                    {course.price === 0 ? "Gratis" : `$${course.price}`}
                  </Badge>
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="h-12 w-12 rounded-full bg-gold/90 flex items-center justify-center">
                    <Play className="h-5 w-5 text-navy-dark fill-current" />
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <span className="text-xs font-medium text-gold">{course.category}</span>
                <h3 className="text-base font-semibold text-card-foreground mt-1 mb-2 line-clamp-2">
                  {course.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-3">por {course.author}</p>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 text-gold fill-current" />
                    {course.rating}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {course.students.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {course.lessons} lecciones
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Button variant="outline" size="lg" className="border-gold/40 text-gold hover:bg-gold/10">
            Ver todos los cursos
          </Button>
        </div>
      </div>
    </section>
  );
};

export default FeaturedCourses;
