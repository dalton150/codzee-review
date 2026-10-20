import { randomUUID } from 'node:crypto';
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from '@jest/globals';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import app from '../../src/app.js';


const TEST_SECRET = 'test-only-secret-for-jwt-verification';
const originalSecret = process.env.JWT_SECRET;

const tokenFor = (userId) =>
  jwt.sign(
    { sub: userId },
    TEST_SECRET,
    { algorithm: 'HS256', expiresIn: '5m' },
  );

beforeAll(() => {
  process.env.JWT_SECRET = TEST_SECRET;
});

afterAll(() => {
  if (originalSecret === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = originalSecret;
  }
});

describe('Task API integration', () => {
    const ownerId = () => `user-${randomUUID()}`;

    it('creates a task and returns 201', async () => {
    const response = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${tokenFor(ownerId())}`)
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
      .set('Authorization', `Bearer ${tokenFor(ownerId())}`)
      .send({ title: 'AB' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('lists only tasks belonging to the requesting owner', async () => {
    const firstOwner = ownerId();
    const secondOwner = ownerId();

    await request(app).post('/api/tasks')
      .set('Authorization', `Bearer ${tokenFor(firstOwner)}`)
      .send({ title: 'First owners task' });

    await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${tokenFor(secondOwner)}`)
      .send({ title: 'Second owners task' });

    const response = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${tokenFor(firstOwner)}`);

    expect(response.status).toBe(200);
    expect(
      response.body.data.items.some(
        (task) => task.title === 'First owners task',
      ),
    ).toBe(true);
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
      .set('Authorization', `Bearer ${tokenFor(firstOwner)}`)
      .send({ title: 'Private task record' });

    const response = await request(app)
      .get(`/api/tasks/${created.body.data.id}`)
      .set('Authorization', `Bearer ${tokenFor(ownerId())}`);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('TASK_NOT_FOUND');
  });


  it('updates a task using PATCH', async () => {
    const owner = ownerId();

    const created = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${tokenFor(owner)}`)
      .send({ title: 'Initial task title' });

    const response = await request(app)
      .patch(`/api/tasks/${created.body.data.id}`)
      .set('Authorization', `Bearer ${tokenFor(owner)}`)
      .send({ status: 'in_progress' });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('in_progress');
  });


  it('deletes a task and returns 204', async () => {
    const owner = ownerId();
    const created = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${tokenFor(owner)}`)
      .send({ title: 'Task to delete' });

    const response = await request(app)
      .delete(`/api/tasks/${created.body.data.id}`)
      .set('Authorization', `Bearer ${tokenFor(owner)}`);

    expect(response.status).toBe(204);
    const followUp = await request(app)
      .get(`/api/tasks/${created.body.data.id}`)
      .set('Authorization', `Bearer ${tokenFor(owner)}`);
    expect(followUp.status).toBe(404);
    expect(followUp.body.error.code).toBe('TASK_NOT_FOUND');
  });

   it('retrieves a task owned by the requesting user', async () => {
    const owner = ownerId();

    const created = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${tokenFor(owner)}`)
      .send({ title: 'Task to retrieve' });

    const response = await request(app)
      .get(`/api/tasks/${created.body.data.id}`)
      .set('Authorization', `Bearer ${tokenFor(owner)}`);

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(created.body.data.id);
    expect(response.body.data.title).toBe('Task to retrieve');
  });

  it('validates and applies pagination query parameters', async () => {
    const owner = ownerId();

    await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${tokenFor(owner)}`)
      .send({ title: 'First pagination task' });

    await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${tokenFor(owner)}`)
      .send({ title: 'Second pagination task' });

    const response = await request(app)
      .get('/api/tasks?page=1&limit=1')
      .set('Authorization', `Bearer ${tokenFor(owner)}`);

    expect(response.status).toBe(200);
    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.pagination).toMatchObject({
      page: 1,
      limit: 1,
      totalItems: 2,
      totalPages: 2,
    });
  });

  it.each([
    ['zero page', 'page=0'],
    ['negative page', 'page=-1'],
    ['decimal page', 'page=1.5'],
    ['non-numeric page', 'page=abc'],
    ['zero limit', 'limit=0'],
    ['negative limit', 'limit=-1'],
    ['decimal limit', 'limit=1.5'],
    ['limit above maximum', 'limit=101'],
    ['non-numeric limit', 'limit=abc'],
    ['unknown query parameter', 'unexpected=true'],
  ])('rejects invalid pagination query: %s', async (_description, query) => {
    const response = await request(app)
      .get(`/api/tasks?${query}`)
      .set('Authorization', `Bearer ${tokenFor(ownerId())}`);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details.length).toBeGreaterThan(0);
  });

  it('uses default pagination values when query parameters are omitted', async () => {
    const owner = ownerId();

    const response = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${tokenFor(owner)}`);

    expect(response.status).toBe(200);
    expect(response.body.data.pagination).toMatchObject({
      page: 1,
      limit: 20,
      totalItems: 0,
      totalPages: 0,
    });
    expect(response.body.data.items).toEqual([]);
  });

    it('returns pagination metadata for a valid second page', async () => {
    const owner = ownerId();

    await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${tokenFor(owner)}`)
      .send({ title: 'First pagination task' });

    await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${tokenFor(owner)}`)
      .send({ title: 'Second pagination task' });

    const response = await request(app)
      .get('/api/tasks?page=2&limit=1')
      .set('Authorization', `Bearer ${tokenFor(owner)}`);

    expect(response.status).toBe(200);
    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.pagination).toMatchObject({
      page: 2,
      limit: 1,
      totalItems: 2,
      totalPages: 2,
    });
  });

  it('returns an empty result for a page beyond the available results', async () => {
    const owner = ownerId();

    await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${tokenFor(owner)}`)
      .send({ title: 'Only pagination task' });

    const response = await request(app)
      .get('/api/tasks?page=2&limit=1')
      .set('Authorization', `Bearer ${tokenFor(owner)}`);

    expect(response.status).toBe(200);
    expect(response.body.data.items).toEqual([]);
    expect(response.body.data.pagination).toMatchObject({
      page: 2,
      limit: 1,
      totalItems: 1,
      totalPages: 1,
    });
  });

  it('rejects client-supplied identity without a Bearer token', async () => {
    const response = await request(app)
      .post('/api/tasks')
      .set('x-user-id', 'user-123')
      .send({ title: 'Attempted identity spoofing' });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('prevents another owner from deleting a task', async () => {
    const owner = ownerId();

    const created = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${tokenFor(owner)}`)
      .send({ title: 'Task protected from deletion' });

    const response = await request(app)
      .delete(`/api/tasks/${created.body.data.id}`)
      .set('Authorization', `Bearer ${tokenFor(ownerId())}`);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('TASK_NOT_FOUND');

    const followUp = await request(app)
      .get(`/api/tasks/${created.body.data.id}`)
      .set('Authorization', `Bearer ${tokenFor(owner)}`);

    expect(followUp.status).toBe(200);
    expect(followUp.body.data.title).toBe('Task protected from deletion');
  });

});