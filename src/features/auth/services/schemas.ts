import { z } from 'zod'

/** Sesión de usuario (doc 04). Auth por cookie de Odoo — sin tokens en el front. */
export const userSessionSchema = z.object({
  id: z.number(), // ll.checklist.user id
  odooUserId: z.number(), // res.users id
  name: z.string(),
  email: z.string(),
  avatarUrl: z.string().nullable(),
})

export const meResponseSchema = z.object({ user: userSessionSchema })
