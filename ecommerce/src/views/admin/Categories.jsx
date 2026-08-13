import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import {
  adminGetCategories, adminCreateCategory, adminUpdateCategory, adminDeleteCategory,
} from '../../service/adminService'
import CategoriaIcono, { ICONOS_CATEGORIA } from '../../components/CategoriaIcono'

const emptyForm = { name: '', icon: 'generico', status: 'activo' }

export default function Categories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const load = () => {
    setLoading(true)
    adminGetCategories().then(setCategories).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true) }
  const openEdit = (cat) => { setEditing(cat); setForm({ name: cat.name, icon: cat.icon || 'generico', status: cat.status }); setModalOpen(true) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (editing) await adminUpdateCategory(editing.id, form)
    else await adminCreateCategory(form)
    setModalOpen(false)
    load()
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta categoría? Esta acción no se puede deshacer.')) return
    await adminDeleteCategory(id)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Categorías</h1>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" /> Nueva categoría
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="text-left px-5 py-3 font-medium">Icono</th>
              <th className="text-left px-5 py-3 font-medium">Nombre</th>
              <th className="text-left px-5 py-3 font-medium">Slug</th>
              <th className="text-left px-5 py-3 font-medium">Estado</th>
              <th className="text-right px-5 py-3 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">Cargando...</td></tr>
            ) : categories.map((cat) => (
              <tr key={cat.id} className="border-t border-gray-50">
                <td className="px-5 py-3 text-gray-700"><CategoriaIcono nombre={cat.icon} size={22} /></td>
                <td className="px-5 py-3 font-medium text-gray-900">{cat.name}</td>
                <td className="px-5 py-3 text-gray-400">{cat.slug}</td>
                <td className="px-5 py-3">
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">{cat.status}</span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => openEdit(cat)} className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(cat.id)} className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-900 text-lg">{editing ? 'Editar categoría' : 'Nueva categoría'}</h2>
              <button onClick={() => setModalOpen(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Icono</label>
                <div className="grid grid-cols-7 gap-2">
                  {Object.entries(ICONOS_CATEGORIA).map(([clave, { etiqueta, Icono }]) => (
                    <button
                      key={clave}
                      type="button"
                      title={etiqueta}
                      aria-label={etiqueta}
                      aria-pressed={form.icon === clave}
                      onClick={() => setForm({ ...form, icon: clave })}
                      className={`flex items-center justify-center aspect-square rounded-xl border transition-all ${
                        form.icon === clave
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-200 text-gray-500 hover:border-blue-400 hover:text-blue-600'
                      }`}
                    >
                      <Icono size={20} weight="regular" />
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-gray-400">
                  {ICONOS_CATEGORIA[form.icon]?.etiqueta ?? 'Sin icono'}
                </p>
              </div>
              {editing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Estado</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500">
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>
              )}
              <button type="submit" className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors">
                {editing ? 'Guardar cambios' : 'Crear categoría'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
