import { motion } from 'framer-motion'
import { Shirt, Facebook, Instagram, Youtube, MessageCircle, Heart } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
                <Shirt className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-base font-bold leading-none">UrbanStyle</p>
                <p className="text-[10px] text-gray-400 tracking-widest uppercase">Fashion Store</p>
              </div>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Tu destino de moda urbana. Las mejores marcas, las últimas tendencias, siempre contigo.
            </p>
            {/* Social */}
            <div className="flex gap-3">
              {[
                { icon: Facebook, label: 'Facebook' },
                { icon: Instagram, label: 'Instagram' },
                { icon: Youtube, label: 'TikTok' },
                { icon: MessageCircle, label: 'WhatsApp' },
              ].map(({ icon: Icon, label }) => (
                <motion.a
                  key={label}
                  href="#"
                  whileHover={{ y: -3, scale: 1.1 }}
                  className="w-9 h-9 bg-gray-800 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-blue-600 transition-all duration-200"
                  aria-label={label}
                >
                  <Icon className="w-4 h-4" />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-4">Tienda</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'Catálogo', to: '/catalogo' },
                { label: 'Ofertas', to: '/ofertas' },
                { label: 'Favoritos', to: '/favoritos' },
                { label: 'Mis pedidos', to: '/pedidos' },
              ].map((item) => (
                <li key={item.label}>
                  <Link to={item.to} className="text-sm text-gray-400 hover:text-white transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Info */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-4">Información</h4>
            <ul className="space-y-2.5">
              {['Sobre nosotros', 'Políticas de envío', 'Devoluciones', 'Términos y condiciones', 'Privacidad', 'Contacto'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Payment */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-4">Pagos seguros</h4>
            <div className="flex flex-wrap gap-2 mb-6">
              {['VISA', 'MC', 'PP', 'YPE'].map((method) => (
                <div key={method} className="px-3 py-1.5 bg-gray-800 rounded-lg text-xs font-bold text-gray-300 border border-gray-700">
                  {method === 'VISA' ? 'Visa' : method === 'MC' ? 'Mastercard' : method === 'PP' ? 'PayPal' : 'Yape'}
                </div>
              ))}
            </div>
            <h4 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-3">Newsletter</h4>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Tu email"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0">
                OK
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">© 2025 UrbanStyle. Todos los derechos reservados.</p>
          <p className="text-xs text-gray-500 flex items-center gap-1.5">
            Hecho con <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500" aria-label="amor" /> en Perú
          </p>
        </div>
      </div>
    </footer>
  )
}
