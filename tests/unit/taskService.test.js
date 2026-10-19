import { beforeEach, describe, expect, it } from '@jest/globals';

import {
    createTask,
    deleteTask,
    getTask,
    listTasks,
    TaskServiceError,
    updateTask,
} from '../../src/services/taskService.js';

describe('Task service',() => {
    let task;

    beforeEach( () => {
        // each test creates it's own task
        // The in-memory store will not reset between tests.
        task = createTask('user-1',{
            title: 'Implement task API',
            description: 'Add service tests',
        });
    });

    it('creates a task with server-generated fields',() => {
        expect(task.id).toBeDefined();
        expect(task.ownerId).toBe('user-1');
        expect(task.status).toBe('pending');
        expect(task.createdAt).toBeDefined();
        expect(task.updatedAt).toBeDefined();
    });

    it('rejects access by a different owner', () => {
        expect(() => getTask(task.id, 'user-2')).toThrow(TaskServiceError);
        expect(() => getTask(task.id,'user-2')).toThrow('Task not found');
    });

    it('lists only the current owner tasks', () => {
        createTask('user-2',{title:'Another user task'});
        const result = listTasks('user-1');

        expect(result.items.every((item) => item.ownerId === 'user-1')).toBe(true);
        expect(result.pagination.totalItems).toBeGreaterThanOrEqual(1);
    });

    it('applies pagination', () => {
        createTask('user-1', { title: 'Second task' });
        createTask('user-1', { title: 'Third task' });

        const result = listTasks('user-1', { page: 1, limit: 2 });

        expect(result.items).toHaveLength(2);
        expect(result.pagination.limit).toBe(2);
    });

    it('allows a valid status transition', () => {
        const updated = updateTask(task.id, 'user-1', {
        status: 'in_progress',
        });

        expect(updated.status).toBe('in_progress');
    });

    it('rejects reopening a completed task', () => {
        updateTask(task.id, 'user-1', { status: 'completed' });

        expect(() =>
            updateTask(task.id, 'user-1', { status: 'pending' }),
        ).toThrow('Cannot transition task from completed to pending');
    });

    it('rejects updating another owners task', () => {
        expect(() =>
            updateTask(task.id, 'user-2', { title: 'Unauthorized change' }),
        ).toThrow('Task not found');
    });

    it('deletes an owned task', () => {
        deleteTask(task.id, 'user-1');

        expect(() => getTask(task.id, 'user-1')).toThrow('Task not found');
    });

    it('rejects missing owner identity', () => {
        expect(() => createTask('', { title: 'Invalid owner task' }))
        .toThrow('A valid owner identity is required');
    });

    it('rejects updates containing unsupported fields', () => {
        expect(() =>
            updateTask(task.id, 'user-1', {
                ownerId: 'user-2',
        }),
        ).toThrow('Update contains unsupported fields');

        expect(getTask(task.id, 'user-1').ownerId).toBe('user-1');
    });

});