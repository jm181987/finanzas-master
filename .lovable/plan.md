

# FinanzasMaster — Plataforma de Cursos de Educación Financiera

## 🎨 Landing Page
- Hero section profesional con diseño moderno en tonos azul oscuro y dorado (temática financiera)
- Secciones: cursos destacados, categorías (Inversiones, Ahorro, Créditos, Educación Financiera, Herramientas, Mentalidad del Dinero), testimonios, call-to-action
- Botones de **Iniciar Sesión** y **Registrarse** en el navbar
- Footer con enlaces e información de la plataforma

## 🔐 Autenticación y Roles
- Registro e inicio de sesión con email/contraseña
- Tres roles: **Admin**, **Desarrollador** (creador de cursos + tutor), **Usuario** (estudiante)
- Los roles se almacenan en tabla separada con seguridad RLS
- Perfil de usuario editable (nombre, avatar, bio)

## 📚 Catálogo de Cursos
- Grid de cursos con imagen, título, categoría, autor, precio (gratis/premium), y valoración
- Filtros por categoría, precio (gratis/de pago), y barra de búsqueda
- Página de detalle del curso: descripción, temario, instructor, reseñas
- Badge de "Gratis" o precio para cursos premium

## 🎬 Visor de Contenido del Curso
- Navegación lateral con módulos y lecciones
- Soporte para tres tipos de contenido: **Videos embebidos** (YouTube/Vimeo), **PDFs** descargables, y **Texto** enriquecido
- Barra de progreso por curso con tracking de lecciones completadas
- Marcador de "lección completada"

## 💰 Pagos (Stripe)
- Compra de cursos premium individuales
- Proceso de checkout con Stripe
- Historial de compras en el perfil del usuario

## 👨‍💻 Panel del Desarrollador
- Crear y editar cursos: título, descripción, categoría, imagen, precio
- Gestión de módulos y lecciones (ordenables)
- Subir PDFs y escribir contenido de texto
- Pegar enlaces de YouTube/Vimeo para videos
- Ver estadísticas de sus cursos (inscritos, progreso promedio)
- Responder dudas/comentarios de estudiantes en cada lección

## 🛡️ Panel de Administración
- Dashboard con métricas: usuarios totales, cursos publicados, ingresos
- Gestión de usuarios: ver, editar roles, desactivar cuentas
- Gestión de cursos: aprobar, rechazar, destacar cursos
- Gestión de categorías

## 📊 Funcionalidades del Estudiante
- Dashboard personal: cursos inscritos, progreso, cursos completados
- Sistema de comentarios/preguntas por lección
- Certificado de finalización descargable (PDF generado)
- Historial de compras

## ⚙️ Backend (Lovable Cloud + Supabase)
- Base de datos: usuarios, perfiles, roles, cursos, módulos, lecciones, inscripciones, progreso, comentarios, pagos
- Almacenamiento de archivos PDF en Supabase Storage
- Edge functions para lógica de negocio y generación de certificados
- Row Level Security en todas las tablas

