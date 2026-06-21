import { z } from 'zod'

export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  username: z.string().min(1),
  // totalWins: z.number(),
  // winsStreak: z.number(),
})

export const loginResponseSchema = z.object({
  token: z.string().min(1),
})

export type User = z.infer<typeof userSchema>