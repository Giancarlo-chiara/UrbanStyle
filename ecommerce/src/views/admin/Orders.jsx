import { useState, useEffect } from 'react'
import { adminGetOrders, adminUpdateOrderStatus } from '../../service/adminService'

const statusOptions = ['pendiente', 'pagado', 'procesando', 'enviado', 'entregado', 'cancelado']

const statusStyles = {
  pendiente: 'bg-amber-100 text-amber-700',
  pagado: 'bg-blue-100 text-blue-700',
  procesando: 'bg-blue-100 text-blue-700',
  enviado: 'bg-indigo-100 text-indigo-700',
  entregado: 'bg-emerald-100 text-emerald-700',
  cancelado: 'bg-red-100 text-red-700',
}

export default function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    adminGetOrders().then(setOrders).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const handleStatusChange = async (id, status) => {
    await adminUpdateOrderStatus(id, status)
    load()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Pedidos</h1>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="text-left px-5 py-3 font-medium">#</th>
              <th className="text-left px-5 py-3 font-medium">Cliente</th>
              <th className="text-left px-5 py-3 font-medium">Total</th>
              <th className="text-left px-5 py-3 font-medium">Fecha</th>
              <th className="text-left px-5 py-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">Cargando...</td></tr>
            ) : orders.map((o) => (
              <tr key={o.id} className="border-t border-gray-50">
                <td className="px-5 py-3 font-medium text-gray-900">#{o.id}</td>
                <td className="px-5 py-3">
                  <p className="text-gray-900">{o.customer_name}</p>
                  <p className="text-xs text-gray-400">{o.customer_email}</p>
                </td>
                <td className="px-5 py-3 font-semibold">S/ {Number(o.total).toFixed(2)}</td>
                <td className="px-5 py-3 text-gray-400">{new Date(o.created_at).toLocaleDateString('es-PE')}</td>
                <td className="px-5 py-3">
                  <select
                    value={o.status}
                    onChange={(e) => handleStatusChange(o.id, e.target.value)}
                    className={`rounded-lg text-xs font-semibold px-2.5 py-1.5 border-0 focus:outline-none capitalize ${statusStyles[o.status] || 'bg-gray-100 text-gray-600'}`}
                  >
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
