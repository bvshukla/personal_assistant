const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Use the same app but we won't call start(); we'll connect to in-memory MongoDB
process.env.NODE_ENV = 'test';
const { app } = require('../server');
const User = require('../models/User');
const Appointment = require('../models/Appointment');

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();
  process.env.MONGODB_URI = uri;
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.connection.close();
  if (mongo) await mongo.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Appointment.deleteMany({});
});

test('GET /api/users requires auth', async () => {
  const res = await request(app).get('/api/users');
  expect(res.status).toBe(401);
});

test('create user, then create and list appointments for that user (auth via header)', async () => {
  const user = await User.create({ name: 'Test', email: 'test@example.com', password: 'secret123' });

  const token = user._id.toString();

  // Create appointment
  const startAt = new Date(Date.now() + 60 * 60 * 1000);
  const endAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const createRes = await request(app)
    .post('/api/appointments')
    .set('x-user-id', token)
    .send({ title: 'Meet', startAt, endAt, location: 'HQ' });
  expect(createRes.status).toBe(201);

  // List appointments for current user
  const listRes = await request(app)
    .get('/api/appointments')
    .set('x-user-id', token);
  expect(listRes.status).toBe(200);
  expect(Array.isArray(listRes.body.items)).toBe(true);
  expect(listRes.body.items.length).toBe(1);
});
