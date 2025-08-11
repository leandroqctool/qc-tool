import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const reviewCreateSchema = z.object({
  projectId: z.string().uuid().optional(),
  fileId: z.string().uuid().optional(),
  status: z.enum(['IN_QC', 'APPROVED', 'REJECTED']).optional(),
  comments: z.string().max(5000).optional(),
}).refine((data) => !!data.projectId || !!data.fileId, {
  message: 'Either projectId or fileId is required',
  path: ['projectId'],
})

export const projectCreateSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(100),
  description: z.string().max(1000).optional(),
})


