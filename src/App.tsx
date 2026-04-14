import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/i18n/LanguageContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminLayout from "@/components/admin/AdminLayout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminCourses from "./pages/admin/AdminCourses";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminCourseContent from "./pages/admin/AdminCourseContent";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminWebhooks from "./pages/admin/AdminWebhooks";
import AdminFCMConfig from "./pages/admin/AdminFCMConfig";
import AdminSignalEmail from "./pages/admin/AdminSignalEmail";
import CourseViewer from "./pages/CourseViewer";
import Courses from "./pages/Courses";
import Signals from "./pages/Signals";
import SignalsTicker from "./components/SignalsTicker";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <LanguageProvider>
          <AuthProvider>
            <SignalsTicker />
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/courses" element={<Courses />} />

              {/* Protected routes - require authentication */}
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/signals" element={<ProtectedRoute><Signals /></ProtectedRoute>} />
              <Route path="/courses/:id" element={<ProtectedRoute><CourseViewer /></ProtectedRoute>} />

              {/* Admin routes */}
              <Route path="/admin" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
              <Route path="/admin/users" element={<AdminLayout><AdminUsers /></AdminLayout>} />
              <Route path="/admin/courses" element={<AdminLayout><AdminCourses /></AdminLayout>} />
              <Route path="/admin/categories" element={<AdminLayout><AdminCategories /></AdminLayout>} />
              <Route path="/admin/courses/:id/content" element={<AdminLayout><AdminCourseContent /></AdminLayout>} />
              <Route path="/admin/notifications" element={<AdminLayout><AdminNotifications /></AdminLayout>} />
              <Route path="/admin/fcm" element={<AdminLayout><AdminFCMConfig /></AdminLayout>} />
              <Route path="/admin/webhooks" element={<AdminLayout><AdminWebhooks /></AdminLayout>} />
              <Route path="/admin/signal-email" element={<AdminLayout><AdminSignalEmail /></AdminLayout>} />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
