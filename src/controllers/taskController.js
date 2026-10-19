import {
    createTask,
    deleteTask,
    getTask,
    listTasks,
    updateTask,
} from '../services/taskService.js';

function getOwnerId(req) {
    return req.user.id;
}

export function createTaskController(req, res, next) {
  try {
    const task = createTask(getOwnerId(req), req.body);

    return res.status(201).json({ data: task });
  } catch (error) {
    return next(error);
  }
}

export function listTasksController(req, res, next) {
  try {
    const result = listTasks(getOwnerId(req), res.locals.validatedQuery);

    return res.status(200).json({ data: result });
  } catch (error) {
    return next(error);
  }
}

export function getTaskController(req, res, next) {
  try {
    const task = getTask(req.params.id, getOwnerId(req));

    return res.status(200).json({ data: task });
  } catch (error) {
    return next(error);
  }
}


export function updateTaskController(req, res, next) {
  try {
    const task = updateTask(
      req.params.id,
      getOwnerId(req),
      req.body,
    );

    return res.status(200).json({ data: task });
  } catch (error) {
    return next(error);
  }
}

export function deleteTaskController(req, res, next) {
  try {
    deleteTask(req.params.id, getOwnerId(req));

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}