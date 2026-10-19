import request from 'supertest';
import { describe, expect, it} from '@jest/globals';
import app from '../../src/app.js';

describe('Error handling', () => {
    it('should return a consistent 404 response for unknown routes' , async () => {
        const response = await request(app).get('/unknown');

        expect(response.status).toBe(404);
        expect(response.body).toEqual({
            error:{
                code:'ROUTE_NOT_FOUND',
                message: 'Route GET /unknown not found',
            },
        });
    });

    it('should return a 400 response for malformed JSON', async () => {
        const response = await request(app).post('/health').set('Content-Type','application/json').send('{"invalid":}');
        expect(response.status).toBe(400);
        expect(response.body).toEqual({
            error: {
                code: 'INVALID_JSON',
                message: 'Request body contains invalid JSON'
            },
        });
        expect(response.body.error.message).not.toMatch(/stack|SyntaxError/i);
    });

    it('preserves the 413 status for oversized JSON requests', async () => {
        const oversizedPayload = {
            title: 'Valid task title',
            padding: 'x'.repeat(110 * 1024),
        };

        const response = await request(app)
            .post('/api/tasks')
            .send(oversizedPayload);

        expect(response.status).toBe(413);
        expect(response.body.error).toBeDefined();
    });
});