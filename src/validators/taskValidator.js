import Joi from 'joi';


const titleSchema = Joi.string().trim().min(3).max(120).required();
const descriptionSchema = Joi.string().trim().max(2000).allow('');
const taskStatusSchema = Joi.string().valid('pending','in_progress','completed');

export const createTaskSchema = Joi.object({
    title:titleSchema,
    description:descriptionSchema.optional(),
}).unknown(false);

export const updateTaskSchema = Joi.object({
    title:titleSchema.optional(),
    description:descriptionSchema.optional(),
    status: taskStatusSchema.optional(),
}).min(1).unknown(false);

export const listTasksQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
}).unknown(false);