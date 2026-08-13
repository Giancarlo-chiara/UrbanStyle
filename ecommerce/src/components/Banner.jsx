import { motion } from "framer-motion";
import {
  ArrowRight,
  ShoppingBag,
  Sparkles,
  Flame,
  Package,
  Award,
  Users,
  Star,
} from "lucide-react";
import { Link } from "react-router-dom";

/* ── Helpers de animación ────────────────────────────────────────────────── */
const fadeUp = (delay = 0, duration = 0.7) => ({
  initial: { opacity: 0, y: 44 },
  animate: { opacity: 1, y: 0 },
  transition: { duration, delay, ease: [0.22, 1, 0.36, 1] },
});

const fadeIn = (delay = 0) => ({
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.8, delay },
});

/*
 * Las cifras y las marcas llegan por props desde Home, calculadas con los datos
 * reales de la API. Antes estaban escritas a mano y MENTÍAN: decían "500+
 * Productos" con 36 en la base, "10K+ Clientes" con 1 usuario registrado, y la
 * lista de marcas incluía "Converse", que no existe en el catálogo. En una
 * sustentación eso es un flanco gratuito: basta que alguien lo cruce con el
 * panel de administración.
 *
 * Se quitó también la "Valoración Promedio": products.rating_avg viene sembrada
 * con valores inventados mientras product_reviews está vacía, así que mostrarla
 * sería presentar como real un dato que no lo es.
 */
const statsPorDefecto = [
  { icon: Package, value: "—", label: "Productos" },
  { icon: Award, value: "—", label: "Marcas" },
  { icon: Users, value: "—", label: "Categorías" },
];

/* ── Partículas decorativas ──────────────────────────────────────────────── */
const particles = [
  { size: 6, x: "18%", y: "22%", delay: 0.2, dur: 3.2 },
  { size: 4, x: "72%", y: "15%", delay: 0.6, dur: 2.8 },
  { size: 8, x: "85%", y: "60%", delay: 0.9, dur: 3.6 },
  { size: 5, x: "10%", y: "70%", delay: 0.4, dur: 4.0 },
  { size: 3, x: "55%", y: "80%", delay: 1.1, dur: 2.6 },
  { size: 7, x: "40%", y: "10%", delay: 0.7, dur: 3.0 },
  { size: 4, x: "92%", y: "35%", delay: 0.3, dur: 3.8 },
  { size: 5, x: "28%", y: "88%", delay: 1.3, dur: 2.9 },
];

export default function Banner({ stats = statsPorDefecto, brands = [] }) {
  return (
    <section className="relative w-full min-h-screen flex flex-col justify-center overflow-hidden bg-[#0F172A]">
      {/* ── Imagen de fondo con zoom suave ─────────────────────────────── */}
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1.08 }}
        animate={{ scale: 1 }}
        transition={{ duration: 8, ease: "easeOut" }}
      >
        <img
          src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1800&auto=format&fit=crop&q=85"
          // Imagen decorativa de fondo: alt vacío para que los lectores de
          // pantalla no la anuncien (el texto del hero ya dice todo).
          alt=""
          width={1800}
          height={1200}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          className="w-full h-full object-cover"
          style={{ filter: "blur(1px)" }}
        />
      </motion.div>

      {/* ── Overlays ───────────────────────────────────────────────────── */}
      {/* Oscuro base */}
      <div className="absolute inset-0 bg-[#0F172A]/70" />
      {/* Degradado izquierda → derecha */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0F172A] via-[#0F172A]/80 to-transparent" />
      {/* Degradado abajo */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-transparent to-transparent" />

      {/* ── Círculos decorativos difuminados ───────────────────────────── */}
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-48 w-[600px] h-[600px] bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-[400px] h-[400px] bg-blue-800/20 rounded-full blur-3xl pointer-events-none" />

      {/* ── Partículas de luz ──────────────────────────────────────────── */}
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-blue-400/40 pointer-events-none"
          style={{ width: p.size, height: p.size, left: p.x, top: p.y }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 0.7, 0], scale: [0, 1, 0] }}
          transition={{
            delay: p.delay,
            duration: p.dur,
            repeat: Infinity,
            repeatDelay: p.dur * 0.6,
          }}
        />
      ))}

      {/* ── Contenido principal ────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 pt-28 pb-20">
        <div className="max-w-[600px]">
          {/* Etiquetas superiores */}
          <motion.div
            {...fadeUp(0.1)}
            className="flex flex-wrap items-center gap-2 mb-8"
          >
            <span className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white tracking-wide rounded-full border border-white/20 bg-white/10 backdrop-blur-md shadow-inner">
              <Flame className="w-3.5 h-3.5 text-orange-400" /> Nueva Colección
              2026
            </span>
            <span className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white tracking-wide rounded-full border border-white/20 bg-white/10 backdrop-blur-md shadow-inner">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" /> Tendencias
              Urbanas
            </span>
          </motion.div>

          {/* Título */}
          <motion.div {...fadeUp(0.22)} className="mb-6">
            <h1 className="font-black leading-[0.92] tracking-tight">
              <span
                className="block text-white"
                style={{
                  fontSize: "clamp(3.5rem, 9vw, 7.5rem)",
                  textShadow: "0 4px 32px rgba(0,0,0,0.5)",
                }}
              >
                DEFINE
              </span>
              <span
                className="block text-white"
                style={{
                  fontSize: "clamp(3.5rem, 9vw, 7.5rem)",
                  textShadow: "0 4px 32px rgba(0,0,0,0.5)",
                }}
              >
                TU
              </span>
              <span
                className="block"
                style={{
                  fontSize: "clamp(3.5rem, 9vw, 7.5rem)",
                  background:
                    "linear-gradient(135deg, #2563EB 0%, #3B82F6 50%, #60A5FA 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  textShadow: "none",
                  filter: "drop-shadow(0 0 32px rgba(37,99,235,0.55))",
                }}
              >
                ESTILO
              </span>
            </h1>
          </motion.div>

          {/* Línea decorativa */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.9, delay: 0.42, ease: "easeOut" }}
            style={{ originX: 0 }}
            className="w-20 h-[3px] rounded-full bg-gradient-to-r from-blue-500 to-indigo-400 mb-7"
          />

          {/* Subtítulo */}
          <motion.p
            {...fadeUp(0.5)}
            className="text-[#E5E7EB]/80 text-base sm:text-lg leading-relaxed mb-10 max-w-[500px]"
          >
            Descubre prendas, zapatillas y accesorios diseñados para quienes
            buscan destacar. Calidad, comodidad y estilo urbano en una sola
            colección.
          </motion.p>

          {/* Botones */}
          <motion.div {...fadeUp(0.62)} className="flex flex-wrap gap-4 mb-12">
            {/* Principal */}
            <Link to="/catalogo">
              <motion.span
                whileHover={{
                  scale: 1.05,
                  boxShadow: "0 0 36px rgba(37,99,235,0.65)",
                }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2.5 px-8 py-4 font-bold text-base text-white rounded-2xl cursor-pointer select-none"
                style={{
                  background:
                    "linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)",
                  boxShadow: "0 8px 32px rgba(37,99,235,0.45)",
                }}
              >
                <ShoppingBag className="w-5 h-5" />
                Comprar ahora
              </motion.span>
            </Link>

            {/* Secundario */}
            <Link to="/catalogo">
              <motion.span
                whileHover={{
                  backgroundColor: "rgba(255,255,255,0.18)",
                  scale: 1.03,
                }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2.5 px-8 py-4 font-bold text-base text-white rounded-2xl border border-white/25 bg-white/10 backdrop-blur-md cursor-pointer select-none transition-colors duration-200"
              >
                Explorar colección
                <ArrowRight className="w-4 h-4" />
              </motion.span>
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div {...fadeUp(0.78)}>
            <div
              className="inline-flex flex-wrap gap-0 bg-white/8 backdrop-blur-xl border border-white/12 rounded-2xl overflow-hidden"
              style={{ background: "rgba(255,255,255,0.07)" }}
            >
              {stats.map(({ icon: Icon, value, label }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.85 + i * 0.1, duration: 0.5 }}
                  className="flex items-center gap-3 px-5 py-4 border-r border-white/10 last:border-r-0"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-600/30 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white font-black text-lg leading-none">
                      {value}
                    </p>
                    <p className="text-gray-400 text-[11px] mt-0.5 leading-tight">
                      {label}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Marcas — reales, desde la API */}
          {brands.length > 0 && (
          <motion.div {...fadeIn(1.2)} className="mt-10">
            <p className="text-gray-500 text-[11px] uppercase tracking-widest font-semibold mb-4">
              Marcas disponibles
            </p>
            <div className="flex flex-wrap items-center gap-6">
              {brands.map((brand, i) => (
                <motion.span
                  key={brand}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.35 }}
                  whileHover={{ opacity: 1, scale: 1.08 }}
                  transition={{ delay: 1.2 + i * 0.08, duration: 0.3 }}
                  className="text-white font-black text-sm tracking-widest uppercase cursor-default"
                >
                  {brand}
                </motion.span>
              ))}
            </div>
          </motion.div>
          )}
        </div>
      </div>

      {/* ── Scroll indicator ───────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.7, ease: "easeInOut" }}
          className="w-5 h-8 border border-white/25 rounded-full flex items-start justify-center pt-1.5"
        >
          <div className="w-1 h-2 bg-blue-400 rounded-full" />
        </motion.div>
        <span className="text-white/25 text-[10px] tracking-widest uppercase">
          Scroll
        </span>
      </motion.div>
    </section>
  );
}
