import { randomUUID } from 'node:crypto';

const tasks = new Map();

const allowedTransitions = {
    pending: ['in_progress', 'completed'],
    in_progress: ['pending','completed'],
    completed: [],
};

export class TaskServiceError extends Error {
    constructor(message, status, code) {
        super(message);
        this.name = 'TaskServiceError';
        this.status = status;
        this.code = code;
        this.expose = true;
    }
}

function assertOwnerId(ownerId) {
    if(typeof ownerId !== 'string' || ownerId.trim() === '') {
        throw new TaskServiceError(
            'A valid owner identity is required',
            401,
            'UNAUTHENTICATED'
        );
    }
}

function validateTaskUpdate(input) {
    if (
        !input ||
        typeof input !== 'object' ||
        Array.isArray(input) ||
        Object.keys(input).length === 0
    ) {
        throw new TaskServiceError(
            'Update must contain at least one valid field',
            400,
            'INVALID_TASK_UPDATE',
        );
    }

    const allowedFields = ['title', 'description', 'status'];
    const unexpectedFields = Object.keys(input).filter(
        (key) => !allowedFields.includes(key),
    );

    if (unexpectedFields.length > 0) {
        throw new TaskServiceError(
            'Update contains unsupported fields',
            400,
            'UNSUPPORTED_UPDATE_FIELDS',
        );
    }

    const normalized = { ...input };

    if (Object.hasOwn(input, 'title')) {
        if (
            typeof input.title !== 'string' ||
            input.title.trim().length < 3 ||
            input.title.trim().length > 120
        ) {
            throw new TaskServiceError(
                'Title must be between 3 and 120 characters',
                400,
                'INVALID_TASK_TITLE',
            );
        }

        normalized.title = input.title.trim();
    }

    if (Object.hasOwn(input, 'description')) {
        if (
            typeof input.description !== 'string' ||
            input.description.trim().length > 2000
        ) {
            throw new TaskServiceError(
                'Description must be a string of at most 2000 characters',
                400,
                'INVALID_TASK_DESCRIPTION',
            );
        }

        normalized.description = input.description.trim();
    }

    if (
        Object.hasOwn(input, 'status') &&
        (
            typeof input.status !== 'string' ||
            !Object.hasOwn(allowedTransitions, input.status)
        )
    ) {
        throw new TaskServiceError(
            'Invalid task status',
            400,
            'INVALID_TASK_STATUS',
        );
    }

    return normalized;
}

function findOwnedTask(id, ownerId) {
    const task = tasks.get(id);

    if(!task || task.ownerId !== ownerId) {
        throw new TaskServiceError(
            'Task not found',
            404,
            'TASK_NOT_FOUND',
        );
    }

    return task;
}


export function createTask(ownerId,input) {
    assertOwnerId(ownerId);
    const now = new Date().toISOString();

    const task = {
        id: randomUUID(),
        ownerId,
        title: input.title,
        description:input.description ?? '',
        status:'pending',
        createdAt: now,
        updatedAt: now,
    };

    tasks.set(task.id,task);
    return {...task};
}


export function listTasks(ownerId, { page = 1, limit = 20 } = {}) {
  assertOwnerId(ownerId);

  const matchingTasks = [...tasks.values()]
    .filter((task) => task.ownerId === ownerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const start = (page - 1) * limit;

  return {
    items: matchingTasks.slice(start, start + limit).map((task) => ({ ...task })),
    pagination: {
      page,
      limit,
      totalItems: matchingTasks.length,
      totalPages: Math.ceil(matchingTasks.length / limit),
    },
  };
}


export function getTask(id,ownerId){
    assertOwnerId(ownerId);
    return {...findOwnedTask(id,ownerId)};
}


export function updateTask(id, ownerId, input) {
    assertOwnerId(ownerId);

    const existing = findOwnedTask(id, ownerId);

    const validatedInput = validateTaskUpdate(input);

    if (
        validatedInput.status &&
        validatedInput.status !== existing.status &&
        !allowedTransitions[existing.status].includes(validatedInput.status)
    ) {
        throw new TaskServiceError(
            `Cannot transition task from ${existing.status} to ${validatedInput.status}`,
            409,
            'INVALID_STATUS_TRANSITION',
        );
    }

    const updated = {
        ...existing,
        ...validatedInput,
        updatedAt: new Date().toISOString(),
    };

    tasks.set(id, updated);

    return { ...updated };
}


export function deleteTask(id,ownerId){
    assertOwnerId(ownerId);
    findOwnedTask(id, ownerId);
    tasks.delete(id);
}