import { Router } from 'express';
import {
  createTaskController,
  deleteTaskController,
  getTaskController,
  listTasksController,
  updateTaskController,
} from '../controllers/taskController.js';

import validate from '../middleware/validate.js';

import {
  createTaskSchema,
  listTasksQuerySchema,
  updateTaskSchema,
} from '../validators/taskValidator.js';

const router = Router();

router.post('/',validate(createTaskSchema),createTaskController);
router.get('/',validate(listTasksQuerySchema,'query'),listTasksController);
router.get('/:id', getTaskController);
router.patch('/:id',validate(updateTaskSchema),updateTaskController);
router.delete('/:id',deleteTaskController);

export default router;