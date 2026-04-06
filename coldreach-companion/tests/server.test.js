const request = require('supertest');
const { createServer } = require('../src/server');

const mockPipeline = {
  run: jest.fn().mockResolvedValue([{ id: '1', name: 'Jane' }]),
};

const app = createServer({ pipeline: mockPipeline });

test('GET /status returns ok and version', async () => {
  const res = await request(app).get('/status');
  expect(res.status).toBe(200);
  expect(res.body.status).toBe('ok');
  expect(res.body.version).toBeDefined();
});

test('POST /scrape with empty body returns 400', async () => {
  const res = await request(app)
    .post('/scrape')
    .send({});
  expect(res.status).toBe(400);
  expect(res.body.error).toBe('urls or companies required');
});

test('POST /scrape with urls calls pipeline.run and returns results', async () => {
  const res = await request(app)
    .post('/scrape')
    .send({ urls: ['https://example.com'] });
  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
  expect(res.body.results).toEqual([{ id: '1', name: 'Jane' }]);
  expect(mockPipeline.run).toHaveBeenCalledWith({ urls: ['https://example.com'], companies: [] });
});
