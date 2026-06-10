import { query, getClient } from '@/lib/db'

export interface User {
  id: string
  email: string
  name: string | null
  role: string
  createdAt: Date
}

export const UserModel = {
  // Find user by email
  async findByEmail(email: string): Promise<User | null> {
    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    )
    return result.rows[0] || null
  },

  // Find user by id
  async findById(id: string): Promise<User | null> {
    const result = await query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    )
    return result.rows[0] || null
  },

  // Create new user
  async create(data: { email: string; name?: string; password?: string }): Promise<User> {
    const result = await query(
      `INSERT INTO users (id, email, name, password) 
       VALUES (gen_random_uuid(), $1, $2, $3) 
       RETURNING *`,
      [data.email, data.name || null, data.password || null]
    )
    return result.rows[0]
  },

  // Update user
  async update(id: string, data: Partial<User>): Promise<User | null> {
    const fields = Object.keys(data)
    if (fields.length === 0) return null

    const setClause = fields.map((field, i) => `"${field}" = $${i + 2}`).join(', ')
    const values = [id, ...fields.map(f => data[f as keyof User])]

    const result = await query(
      `UPDATE users SET ${setClause}, "updatedAt" = NOW() WHERE id = $1 RETURNING *`,
      values
    )
    return result.rows[0] || null
  },

  // Delete user
  async delete(id: string): Promise<boolean> {
    const result = await query('DELETE FROM users WHERE id = $1', [id])
    return result.rowCount ? result.rowCount > 0 : false
  }
}