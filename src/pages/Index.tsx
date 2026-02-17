import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import CategoriesSection from "@/components/landing/CategoriesSection";
import FeaturedCourses from "@/components/landing/FeaturedCourses";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <main className="min-h-screen">
      <Navbar />
      <HeroSection />
      <FeaturedCourses />
      <CategoriesSection />
      <TestimonialsSection />
      <CTASection />
      <Footer />
    </main>
  );
};

export default Index;
