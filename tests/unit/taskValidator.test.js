import { describe, expect, it } from '@jest/globals';
import { createTaskSchema, updateTaskSchema, listTasksQuerySchema } from '../../src/validators/taskValidator.js';

describe('createTaskSchema', () => {
    it('accepts a valid task', () => {
        const result = createTaskSchema.validate({
            title: 'Implement task API',
            description: 'Add validation and tests',
        });

        expect(result.error).toBeUndefined();
    });

  it('rejects a title shorter than three characters', () => {
        const result = createTaskSchema.validate({
            title: 'AB',
        });

        expect(result.error).toBeDefined();
    });

  it('rejects server-controlled fields', () => {
        const result = createTaskSchema.validate({
            title: 'Implement task API',
            ownerId: 'another user',
        });

        expect(result.error).toBeDefined();
    });
});


describe('updateTaskSchema', () => {
    it('accepts a valid partial update', () => {
        const result = updateTaskSchema.validate({
            status: 'in_progress',
        });

        expect(result.error).toBeUndefined();
    });

    it('rejects an empty update', () => {
        const result = updateTaskSchema.validate({});

        expect(result.error).toBeDefined();
    });

    it('rejects protected fields', () => {
        const result = updateTaskSchema.validate({
            title: 'Updated task',
            ownerId: 'another-user',
        });

        expect(result.error).toBeDefined();
    });

});


describe('listTasksQuerySchema', () => {
    it('applies pagination defaults', () => {
        const result = listTasksQuerySchema.validate({});

        expect(result.error).toBeUndefined();
        expect(result.value).toEqual({
            page:1,
            limit:20,
        });
    });

    it('rejects a limit greater than 100' , () => {
        const result = listTasksQuerySchema.validate({
            limit:101,
        });

        expect(result.error).toBeDefined();
    });
})