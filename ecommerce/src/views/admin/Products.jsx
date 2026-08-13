import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, X, Image as ImageIcon, Layers } from 'lucide-react'
import {
  adminGetProducts, adminCreateProduct, adminUpdateProduct, adminDeleteProduct, adminGetProduct,
  adminAddProductImage, adminRemoveProductImage, adminAddVariant, adminUpdateVariantStock, adminDeleteVariant,
  adminGetCategories, adminGetBrands,
} from '../../service/adminService'

const emptyForm = {
  name: '', description: '', category_id: '', brand_id: '', price: '', discount_percent: 0, status: 'activo', is_featured: false,
}

export default function Products() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [brands, setBrands] = useState([])
  const [loading, setLoading] = useState(true)

  const [formModalOpen, setFormModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [detailProduct, setDetailProduct] = useState(null)
  const [newImageUrl, setNewImageUrl] = useState('')
  const [newVariant, setNewVariant] = useState({ size: '', color: 'Estándar', stock: 0 })

  const load = () => {
    setLoading(true)
    adminGetProducts().then((res) => setProducts(res.items)).finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    adminGetCategories().then(setCategories).catch(() => setCategories([]))
    adminGetBrands().then(setBrands).catch(() => setBrands([]))
  }, [])

  // ---- Crear / editar datos básicos ----
  const openCreate = () => { setEditing(null); setForm(emptyForm); setFormModalOpen(true) }
  const openEdit = (p) => {
    setEditing(p)
    setForm({
      name: p.name,
      description: p.description || '',
      category_id: p.category_id,
      brand_id: p.brand_id,
      price: p.price,
      discount_percent: p.discount_percent,
      status: p.status,
      is_featured: p.is_featured,
    })
    setFormModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = { ...form, category_id: Number(form.category_id), brand_id: Number(form.brand_id), price: Number(form.price), discount_percent: Number(form.discount_percent) }
    if (editing) await adminUpdateProduct(editing.id, payload)
    else await adminCreateProduct(payload)
    setFormModalOpen(false)
    load()
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este producto y todas sus variantes/imágenes?')) return
    await adminDeleteProduct(id)
    load()
  }

  // ---- Gestionar imágenes / variantes ----
  const openDetail = async (p) => {
    const full = await adminGetProduct(p.id)
    setDetailProduct(full)
    setDetailModalOpen(true)
  }

  const refreshDetail = async () => {
    const full = await adminGetProduct(detailProduct.id)
    setDetailProduct(full)
    load()
  }

  const handleAddImage = async () => {
    if (!newImageUrl.trim()) return
    await adminAddProductImage(detailProduct.id, newImageUrl.trim(), detailProduct.images.length === 0)
    setNewImageUrl('')
    refreshDetail()
  }

  const handleRemoveImage = async (imageId) => {
    await adminRemoveProductImage(imageId)
    refreshDetail()
  }

  const handleAddVariant = async () => {
    if (!newVariant.size.trim()) return
    await adminAddVariant(detailProduct.id, { ...newVariant, stock: Number(newVariant.stock) })
    setNewVariant({ size: '', color: 'Estándar', stock: 0 })
    refreshDetail()
  }

  const handleVariantStock = async (variantId, stock) => {
    await adminUpdateVariantStock(variantId, Number(stock))
    refreshDetail()
  }

  const handleDeleteVariant = async (variantId) => {
    await adminDeleteVariant(variantId)
    refreshDetail()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" /> Nuevo producto
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="text-left px-5 py-3 font-medium">Producto</th>
              <th className="text-left px-5 py-3 font-medium">Categoría</th>
              <th className="text-left px-5 py-3 font-medium">Marca</th>
              <th className="text-left px-5 py-3 font-medium">Precio final</th>
              <th className="text-left px-5 py-3 font-medium">Stock</th>
              <th className="text-left px-5 py-3 font-medium">Estado</th>
              <th className="text-right px-5 py-3 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-400">Cargando...</td></tr>
            ) : products.map((p) => (
              <tr key={p.id} className="border-t border-gray-50">
                <td className="px-5 py-3 font-medium text-gray-900 max-w-[220px] truncate">{p.name}</td>
                <td className="px-5 py-3 text-gray-500">{p.category}</td>
                <td className="px-5 py-3 text-gray-500">{p.brand}</td>
                <td className="px-5 py-3 font-semibold">S/ {Number(p.final_price).toFixed(2)}</td>
                <td className="px-5 py-3">{p.stock}</td>
                <td className="px-5 py-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${p.status === 'activo' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex justify-end gap-1.5">
                    <button onClick={() => openDetail(p)} title="Imágenes y variantes" className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                      <Layers className="w-4 h-4" />
                    </button>
                    <button onClick={() => openEdit(p)} className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal: crear/editar datos básicos */}
      {formModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setFormModalOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 my-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-900 text-lg">{editing ? 'Editar producto' : 'Nuevo producto'}</h2>
              <button onClick={() => setFormModalOpen(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Descripción</label>
                <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Categoría</label>
                  <select required value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500">
                    <option value="">Selecciona...</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Marca</label>
                  <select required value={form.brand_id} onChange={(e) => setForm({ ...form, brand_id: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500">
                    <option value="">Selecciona...</option>
                    {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Precio (S/)</label>
                  <input required type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Descuento (%)</label>
                  <input type="number" step="0.01" value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Estado</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500">
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                    <option value="agotado">Agotado</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-600 mt-6">
                  <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                  Producto destacado
                </label>
              </div>
              <button type="submit" className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors">
                {editing ? 'Guardar cambios' : 'Crear producto'}
              </button>
              {!editing && (
                <p className="text-xs text-gray-400 text-center">
                  Después de crearlo, usa el ícono <Layers className="w-3 h-3 inline" /> para agregar imágenes y tallas.
                </p>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Modal: imágenes y variantes */}
      {detailModalOpen && detailProduct && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setDetailModalOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 my-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-900 text-lg">{detailProduct.name}</h2>
              <button onClick={() => setDetailModalOpen(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            {/* Imágenes */}
            <div className="mb-8">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                <ImageIcon className="w-4 h-4" /> Imágenes
              </h3>
              <div className="flex flex-wrap gap-3 mb-3">
                {detailProduct.images?.map((img) => (
                  <div key={img.id} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 group">
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => handleRemoveImage(img.id)}
                      className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {img.is_primary && <span className="absolute bottom-0 inset-x-0 bg-blue-600 text-white text-[10px] text-center py-0.5">Principal</span>}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="https://... URL de la imagen"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
                <button onClick={handleAddImage} className="px-3 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors">
                  Agregar
                </button>
              </div>
            </div>

            {/* Variantes */}
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                <Layers className="w-4 h-4" /> Tallas / colores / stock
              </h3>
              <div className="space-y-2 mb-3">
                {detailProduct.variants?.map((v) => (
                  <div key={v.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2">
                    <span className="text-sm font-medium w-16">{v.size}</span>
                    <span className="text-xs text-gray-400 flex-1">{v.color} · ID {v.id}</span>
                    <input
                      type="number"
                      defaultValue={v.stock}
                      onBlur={(e) => handleVariantStock(v.id, e.target.value)}
                      className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:border-blue-500"
                    />
                    <button onClick={() => handleDeleteVariant(v.id)} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input placeholder="Talla" value={newVariant.size} onChange={(e) => setNewVariant({ ...newVariant, size: e.target.value })}
                  className="w-20 px-2 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
                <input placeholder="Color" value={newVariant.color} onChange={(e) => setNewVariant({ ...newVariant, color: e.target.value })}
                  className="flex-1 px-2 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
                <input type="number" placeholder="Stock" value={newVariant.stock} onChange={(e) => setNewVariant({ ...newVariant, stock: e.target.value })}
                  className="w-24 px-2 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
                <button onClick={handleAddVariant} className="px-3 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors">
                  Agregar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
