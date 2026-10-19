import { randomUUID } from 'node:crypto';
import { describe, expect, it } from '@jest/globals';
import request from 'supertest';
import app from '../../src/app.js';

describe('Task API integration', () => {
    const ownerId = () => `user-${randomUUID()}`;

    it('creates a task and returns 201', async () => {
    const response = await request(app)
      .post('/api/tasks')
      .set('x-user-id', ownerId())
      .send({
        title: 'Implement task API',
        description: 'Add integration tests',
      });

    expect(response.status).toBe(201);
    expect(response.body.data.id).toBeDefined();
    expect(response.body.data.title).toBe('Implement task API');
    expect(response.body.data.status).toBe('pending');
  });

  it('rejects a task with an invalid title', async () => {
    const response = await request(app)
      .post('/api/tasks')
      .set('x-user-id', ownerId())
      .send({ title: 'AB' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('lists only tasks belonging to the requesting owner', async () => {
    const firstOwner = ownerId();
    const secondOwner = ownerId();

    await request(app).post('/api/tasks')
      .set('x-user-id', firstOwner)
      .send({ title: 'First owners task' });

    await request(app)
      .post('/api/tasks')
      .set('x-user-id', secondOwner)
      .send({ title: 'Second owners task' });

    const response = await request(app)
      .get('/api/tasks')
      .set('x-user-id', firstOwner);

    expect(response.status).toBe(200);
    expect(
      response.body.data.items.every(
        (task) => task.ownerId === firstOwner,
      ),
    ).toBe(true);
    expect(
      response.body.data.items.some(
        (task) => task.title === 'Second owners task',
      ),
    ).toBe(false);
  });

  it('returns 404 when another owner requests a task', async () => {
    const firstOwner = ownerId();

    const created = await request(app)
      .post('/api/tasks')
      .set('x-user-id', firstOwner)
      .send({ title: 'Private task record' });

    const response = await request(app)
      .get(`/api/tasks/${created.body.data.id}`)
      .set('x-user-id', ownerId());

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('TASK_NOT_FOUND');
  });


  it('updates a task using PATCH', async () => {
    const owner = ownerId();

    const created = await request(app)
      .post('/api/tasks')
      .set('x-user-id', owner)
      .send({ title: 'Initial task title' });

    const response = await request(app)
      .patch(`/api/tasks/${created.body.data.id}`)
      .set('x-user-id', owner)
      .send({ status: 'in_progress' });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('in_progress');
  });


  it('deletes a task and returns 204', async () => {
    const owner = ownerId();
    const created = await request(app)
      .post('/api/tasks')
      .set('x-user-id', owner)
      .send({ title: 'Task to delete' });

    const response = await request(app)
      .delete(`/api/tasks/${created.body.data.id}`)
      .set('x-user-id', owner);

    expect(response.status).toBe(204);
  });

   it('retrieves a task owned by the requesting user', async () => {
    const owner = ownerId();

    const created = await request(app)
      .post('/api/tasks')
      .set('x-user-id', owner)
      .send({ title: 'Task to retrieve' });

    const response = await request(app)
      .get(`/api/tasks/${created.body.data.id}`)
      .set('x-user-id', owner);

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(created.body.data.id);
    expect(response.body.data.title).toBe('Task to retrieve');
  });

  it('validates and applies pagination query parameters', async () => {
    const owner = ownerId();

    await request(app)
      .post('/api/tasks')
      .set('x-user-id', owner)
      .send({ title: 'First pagination task' });

    await request(app)
      .post('/api/tasks')
      .set('x-user-id', owner)
      .send({ title: 'Second pagination task' });

    const response = await request(app)
      .get('/api/tasks?page=1&limit=1')
      .set('x-user-id', owner);

    expect(response.status).toBe(200);
    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.pagination).toMatchObject({
      page: 1,
      limit: 1,
      totalItems: 2,
      totalPages: 2,
    });
  });

});