import type { Access } from '@davincios/cms'

type UserWithRole = {
  role?: 'admin' | 'staff' | 'customer'
}

export const anyone: Access = () => true

export const adminUsers: Access = ({ req }) => {
  const user = req.user as UserWithRole | undefined

  if (!user) {
    return false
  }

  // Existing first admin accounts may predate the role field.
  return !user.role || user.role === 'admin' || user.role === 'staff'
}
