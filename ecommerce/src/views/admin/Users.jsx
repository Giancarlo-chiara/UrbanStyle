import { useState, useEffect } from 'react'
import { adminGetUsers, adminUpdateUserStatus, adminUpdateUserRole, adminDeleteUser } from '../../service/adminService'
import { Trash2 } from 'lucide-react'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    adminGetUsers().then(setUsers).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const handleStatusChange = async (id, status) => {
    await adminUpdateUserStatus(id, status)
    load()
  }

  const handleRoleChange = async (id, role) => {
    const roleId = role === 'admin' ? 1 : 2
    await adminUpdateUserRole(id, roleId)
    load()
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este usuario permanentemente?')) return
    await adminDeleteUser(id)
    load()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Usuarios</h1>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="text-left px-5 py-3 font-medium">Nombre</th>
              <th className="text-left px-5 py-3 font-medium">Email</th>
              <th className="text-left px-5 py-3 font-medium">Rol</th>
              <th className="text-left px-5 py-3 font-medium">Estado</th>
              <th className="text-right px-5 py-3 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">Cargando...</td></tr>
            ) : users.map((u) => (
              <tr key={u.id} className="border-t border-gray-50">
                <td className="px-5 py-3 font-medium text-gray-900">{u.full_name}</td>
                <td className="px-5 py-3 text-gray-500">{u.email}</td>
                <td className="px-5 py-3">
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    className="border border-gray-200 rounded-lg text-xs px-2 py-1.5 focus:outline-none focus:border-blue-500"
                  >
                    <option value="cliente">Cliente</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-5 py-3">
                  <select
                    value={u.status}
                    onChange={(e) => handleStatusChange(u.id, e.target.value)}
                    className="border border-gray-200 rounded-lg text-xs px-2 py-1.5 focus:outline-none focus:border-blue-500"
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                    <option value="bloqueado">Bloqueado</option>
                  </select>
                </td>
                <td className="px-5 py-3">
                  <div className="flex justify-end">
                    <button onClick={() => handleDelete(u.id)} className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
