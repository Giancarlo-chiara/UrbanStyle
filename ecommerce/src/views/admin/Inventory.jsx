import { useState, useEffect } from 'react'
import { Plus, X } from 'lucide-react'
import { adminGetInventory, adminRegisterMovement } from '../../service/adminService'

const emptyForm = { variant_id: '', type: 'entrada', quantity: 1, reason: '' }

export default function Inventory() {
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    adminGetInventory().then(setMovements).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await adminRegisterMovement({ ...form, variant_id: Number(form.variant_id), quantity: Number(form.quantity) })
      setModalOpen(false)
      setForm(emptyForm)
      load()
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo registrar el movimiento.')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
        <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" /> Registrar movimiento
        </button>
      </div>

      <p className="text-sm text-gray-400 mb-4">
        Encuentra el <strong>ID de variante</strong> en la sección de Productos → detalle → variantes.
      </p>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="text-left px-5 py-3 font-medium">Producto</th>
              <th className="text-left px-5 py-3 font-medium">Variante</th>
              <th className="text-left px-5 py-3 font-medium">Tipo</th>
              <th className="text-left px-5 py-3 font-medium">Cantidad</th>
              <th className="text-left px-5 py-3 font-medium">Stock actual</th>
              <th className="text-left px-5 py-3 font-medium">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">Cargando...</td></tr>
            ) : movements.map((m) => (
              <tr key={m.id} className="border-t border-gray-50">
                <td className="px-5 py-3 font-medium text-gray-900">{m.product_name}</td>
                <td className="px-5 py-3 text-gray-500">{m.size} / {m.color}</td>
                <td className="px-5 py-3 capitalize">{m.type}</td>
                <td className="px-5 py-3">{m.quantity}</td>
                <td className="px-5 py-3 font-semibold">{m.current_stock}</td>
                <td className="px-5 py-3 text-gray-400">{new Date(m.created_at).toLocaleString('es-PE')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-900 text-lg">Registrar movimiento</h2>
              <button onClick={() => setModalOpen(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">ID de variante</label>
                <input required type="number" value={form.variant_id} onChange={(e) => setForm({ ...form, variant_id: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500">
                  <option value="entrada">Entrada</option>
                  <option value="salida">Salida</option>
                  <option value="ajuste">Ajuste</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Cantidad</label>
                <input required type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Motivo (opcional)</label>
                <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <button type="submit" className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors">
                Registrar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
