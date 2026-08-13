import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Package, ShoppingBag, Users, AlertTriangle, Wallet, Receipt,
  Boxes, ArrowRight, RefreshCw, PackageX,
} from 'lucide-react'
import { adminGetStats } from '../../service/adminService'

const soles = (v) =>
  `S/ ${Number(v ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const numero = (v) => Number(v ?? 0).toLocaleString('es-PE')

const COLOR_ESTADO = {
  pendiente: 'bg-amber-100 text-amber-700',
  pagado: 'bg-blue-100 text-blue-700',
  procesando: 'bg-blue-100 text-blue-700',
  enviado: 'bg-indigo-100 text-indigo-700',
  entregado: 'bg-emerald-100 text-emerald-700',
  cancelado: 'bg-red-100 text-red-700',
}

function Tarjeta({ icon: Icon, label, valor, detalle, color, cargando }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-4"
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5 text-white" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        {cargando ? (
          <div className="h-7 w-24 bg-gray-100 rounded animate-pulse mb-1.5" />
        ) : (
          <p className="text-2xl font-bold text-gray-900 leading-tight truncate">{valor}</p>
        )}
        <p className="text-sm text-gray-500">{label}</p>
        {detalle && !cargando && <p className="text-xs text-gray-400 mt-0.5">{detalle}</p>}
      </div>
    </motion.div>
  )
}

function Panel({ titulo, children, accion }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-gray-900">{titulo}</h2>
        {accion}
      </div>
      {children}
    </div>
  )
}

export default function Dashboard() {
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargar = () => {
    setCargando(true)
    setError('')
    adminGetStats(5)
      .then(setDatos)
      // Antes los .catch devolvían valores vacíos y el panel pintaba cuatro ceros
      // como si fueran datos reales aunque la API estuviera caída.
      .catch(() => setError('No pudimos cargar el resumen. Revisa que la API esté disponible.'))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [])

  const d = datos ?? {}
  const totalPedidos = (d.pedidosPorEstado ?? []).reduce((a, x) => a + Number(x.cantidad), 0)
  const variantes = Number(d.inventario?.variantes ?? 0)
  const criticas = Number(d.inventario?.criticas ?? 0)
  const porcentajeCritico = variantes ? Math.round((criticas / variantes) * 100) : 0

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Resumen general</h1>
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-8 text-center">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" aria-hidden="true" />
          <p className="text-gray-700 mb-5">{error}</p>
          <button
            onClick={cargar}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" /> Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Resumen general</h1>
        <button
          onClick={cargar}
          disabled={cargando}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-blue-600 rounded-lg hover:bg-white transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} aria-hidden="true" />
          Actualizar
        </button>
      </div>

      {/* Dinero primero: es lo que responde "¿cómo va el negocio?" */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
        <Tarjeta
          icon={Wallet} color="bg-emerald-600" cargando={cargando}
          label="Ingresos" valor={soles(d.dinero?.ingresos)}
          detalle="Excluye pedidos cancelados"
        />
        <Tarjeta
          icon={Receipt} color="bg-blue-600" cargando={cargando}
          label="Ticket promedio" valor={soles(d.dinero?.ticket_promedio)}
          detalle={`${numero(d.dinero?.pedidos_validos)} pedidos válidos`}
        />
        <Tarjeta
          icon={ShoppingBag} color="bg-indigo-600" cargando={cargando}
          label="Pedidos" valor={numero(totalPedidos)}
          detalle={`${soles(d.dinero?.descuentos)} en descuentos`}
        />
        <Tarjeta
          icon={Users} color="bg-violet-600" cargando={cargando}
          label="Clientes" valor={numero(d.usuarios?.clientes)}
          detalle={`${numero(d.usuarios?.admins)} administrador(es)`}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-10">
        <Tarjeta
          icon={Package} color="bg-gray-800" cargando={cargando}
          label="Productos activos" valor={numero(d.productos?.activos)}
          // La etiqueta anterior decía "Productos activos" pero el número incluía
          // también los agotados, porque contaba todo lo que no fuera 'inactivo'.
          detalle={`${numero(d.productos?.agotados)} agotados · ${numero(d.productos?.inactivos)} inactivos`}
        />
        <Tarjeta
          icon={Boxes} color="bg-slate-600" cargando={cargando}
          label="Unidades en stock" valor={numero(d.inventario?.unidades)}
          detalle={`repartidas en ${numero(variantes)} variantes`}
        />
        <Tarjeta
          icon={AlertTriangle} color="bg-amber-500" cargando={cargando}
          label="Variantes bajo mínimo" valor={numero(criticas)}
          detalle={`${porcentajeCritico}% del catálogo (≤ ${d.umbral ?? 5} unidades)`}
        />
        <Tarjeta
          icon={PackageX} color="bg-red-500" cargando={cargando}
          label="Variantes agotadas" valor={numero(d.inventario?.agotadas)}
          detalle="Sin unidades disponibles"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Panel titulo="Pedidos por estado">
          {cargando ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => <div key={i} className="h-9 bg-gray-50 rounded-lg animate-pulse" />)}
            </div>
          ) : totalPedidos === 0 ? (
            <p className="text-sm text-gray-400">Todavía no hay pedidos registrados.</p>
          ) : (
            <div className="space-y-2.5">
              {d.pedidosPorEstado.map(({ status, cantidad }) => {
                const pct = Math.round((Number(cantidad) / totalPedidos) * 100)
                return (
                  <div key={status} className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize w-28 text-center flex-shrink-0 ${COLOR_ESTADO[status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {status}
                    </span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.5 }}
                        className="h-full bg-blue-600 rounded-full"
                      />
                    </div>
                    <span className="text-sm text-gray-500 w-16 text-right flex-shrink-0">
                      {numero(cantidad)} · {pct}%
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </Panel>

        <Panel
          titulo="Más vendidos"
          accion={
            <Link to="/admin/productos" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
              Productos <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          }
        >
          {cargando ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => <div key={i} className="h-9 bg-gray-50 rounded-lg animate-pulse" />)}
            </div>
          ) : !d.masVendidos?.length ? (
            <p className="text-sm text-gray-400">Todavía no hay ventas registradas.</p>
          ) : (
            <ul className="space-y-3">
              {d.masVendidos.map((p, i) => (
                <li key={p.product_id} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="flex-1 min-w-0 truncate text-sm text-gray-900">{p.nombre}</span>
                  <span className="text-sm text-gray-400 flex-shrink-0">{numero(p.unidades)} u.</span>
                  <span className="text-sm font-semibold text-gray-900 w-24 text-right flex-shrink-0">
                    {soles(p.ingresos)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel
          titulo="Últimos pedidos"
          accion={
            <Link to="/admin/pedidos" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
              Ver todos <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          }
        >
          {cargando ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => <div key={i} className="h-9 bg-gray-50 rounded-lg animate-pulse" />)}
            </div>
          ) : !d.ultimosPedidos?.length ? (
            <p className="text-sm text-gray-400">Todavía no hay pedidos.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {d.ultimosPedidos.map((o) => (
                <li key={o.id} className="py-2.5 flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-400 w-10 flex-shrink-0">#{o.id}</span>
                  <span className="flex-1 min-w-0 truncate text-sm text-gray-900">{o.customer_name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize flex-shrink-0 ${COLOR_ESTADO[o.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {o.status}
                  </span>
                  <span className="text-sm font-semibold text-gray-900 w-24 text-right flex-shrink-0">
                    {soles(o.total)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          titulo={`Stock más crítico (≤ ${d.umbral ?? 5} unidades)`}
          accion={
            <Link to="/admin/inventario" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
              Inventario <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          }
        >
          {cargando ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => <div key={i} className="h-9 bg-gray-50 rounded-lg animate-pulse" />)}
            </div>
          ) : !d.stockCritico?.length ? (
            <p className="text-sm text-gray-400">No hay variantes con stock crítico.</p>
          ) : (
            <>
              <ul className="divide-y divide-gray-50">
                {d.stockCritico.map((v) => (
                  <li key={v.variant_id} className="py-2.5 flex items-center gap-3">
                    <span className="flex-1 min-w-0 truncate text-sm text-gray-900">{v.product_name}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">{v.size} · {v.color}</span>
                    <span className={`text-sm font-bold w-8 text-right flex-shrink-0 ${Number(v.stock) === 0 ? 'text-red-600' : 'text-amber-600'}`}>
                      {v.stock}
                    </span>
                  </li>
                ))}
              </ul>
              {criticas > d.stockCritico.length && (
                // Antes se pintaban las 113 filas de golpe, sin avisar de nada.
                <p className="text-xs text-gray-400 mt-3">
                  Mostrando las {d.stockCritico.length} más urgentes de {numero(criticas)}.
                </p>
              )}
            </>
          )}
        </Panel>
      </div>
    </div>
  )
}
