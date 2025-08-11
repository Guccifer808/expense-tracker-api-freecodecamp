import request from 'supertest';
import app from '../server.js'; // Ensure the .js extension is present
import mongoose from 'mongoose';
import User from '../models/User.js';
import Exercise from '../models/Exercise.js';
import 'dotenv/config';

let userId;

beforeAll(async () => {
  // Connect to a test database and clear it
  // Use MAIN database for testing purposes
  // avoid doing so with production db
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  await User.deleteMany({});
  await Exercise.deleteMany({});
});

afterAll(async () => {
  // Disconnect from the test database
  await mongoose.connection.close();
});

describe('User API Endpoints', () => {
  it('should create a new user on POST /api/users', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ username: 'testuser' });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('username', 'testuser');
    expect(res.body).toHaveProperty('_id');
    userId = res.body._id; // Save the ID for subsequent tests
  });

  it('should return a user log on GET /api/users/:_id/logs', async () => {
    // First, add an exercise for the user
    await request(app)
      .post(`/api/users/${userId}/exercises`)
      .send({ description: 'running', duration: 30 });

    const res = await request(app).get(`/api/users/${userId}/logs`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('username', 'testuser');
    expect(res.body).toHaveProperty('count', 1);
    expect(res.body.log).toHaveLength(1);
    expect(res.body.log[0]).toHaveProperty('description', 'running');
  });

  it('should handle invalid user ID on GET /api/users/:_id/logs', async () => {
    const res = await request(app).get(`/api/users/invalidid1234567890/logs`);
    expect(res.statusCode).toEqual(404);
    // Correct the expected message to match the new API response
    expect(res.body).toHaveProperty('error', 'Invalid user ID');
  });
});
