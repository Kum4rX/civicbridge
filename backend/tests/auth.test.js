const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');
const express = require('express');
const app = require('../src/app');
const User = require('../src/models/user.model');
const authenticate = require('../src/middleware/auth.middleware');
const authorize = require('../src/middleware/role.middleware');
const { errorHandler } = require('../src/middleware/error.middleware');
const { sendSuccess } = require('../src/utils/response');

let mongoServer;
jest.setTimeout(60000);

// Create an isolated sub-app to test role-based authorization middleware
const roleTestApp = express();
roleTestApp.use(express.json());
roleTestApp.get(
  '/test/official-only',
  authenticate,
  authorize('OFFICIAL'),
  (req, res) => {
    return sendSuccess(res, 200, 'Official access granted', { user: req.user });
  }
);
roleTestApp.get(
  '/test/citizen-only',
  authenticate,
  authorize('CITIZEN'),
  (req, res) => {
    return sendSuccess(res, 200, 'Citizen access granted', { user: req.user });
  }
);
roleTestApp.use(errorHandler);

beforeAll(async () => {
  process.env.JWT_SECRET = 'test_jwt_secret_key_12345';
  process.env.JWT_EXPIRES_IN = '1h';

  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  await User.deleteMany({});
});

describe('Civix Phase 1 Backend API Tests', () => {
  describe('Health Check Endpoint', () => {
    it('GET /api/health should return 200 and operational status', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('online');
    });
  });

  describe('User Registration (POST /api/auth/register)', () => {
    const validCitizenData = {
      fullName: 'John Citizen',
      name: 'John Citizen',
      email: 'citizen@example.com',
      password: 'Password123!',
      role: 'CITIZEN',
      location: {
        address: '123 Main St',
        city: 'Civic City',
        state: 'Karnataka',
        pincode: '560001',
        latitude: 12.9716,
        longitude: 77.5946
      }
    };

    const validOfficialData = {
      fullName: 'Jane Official',
      name: 'Jane Official',
      email: 'official@gov.org',
      password: 'OfficialPass123!',
      role: 'OFFICIAL',
      location: {
        city: 'Civic City',
        state: 'Karnataka',
        pincode: '560001'
      },
      verification: {
        documentType: 'GOVERNMENT_ID'
      }
    };

    it('should successfully register a valid citizen', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(validCitizenData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data.user.fullName || res.body.data.user.name).toBe('John Citizen');
      expect(res.body.data.user.email).toBe('citizen@example.com');
      expect(res.body.data.user.role).toBe('CITIZEN');
      expect(res.body.data.user.location.city).toBe('Civic City');
      expect(res.body.data.user.location.latitude).toBe(12.9716);
      expect(res.body.data.user.password).toBeUndefined();
    });

    it('should successfully register a valid official', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(validOfficialData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('OFFICIAL');
      expect(res.body.data.user.password).toBeUndefined();
    });

    it('should reject registration when email is already registered (duplicate email)', async () => {
      // First registration
      await request(app).post('/api/auth/register').send(validCitizenData);

      // Attempt duplicate registration
      const res = await request(app)
        .post('/api/auth/register')
        .send(validCitizenData);

      expect([400, 409]).toContain(res.status);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/(already (registered|exists)|Registration failed)/i);
    });

    it('should reject registration with invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          ...validCitizenData,
          email: ''
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors || res.body.message).toBeDefined();
    });

    it('should reject registration when name is missing', async () => {
      const { fullName, name, ...incompleteData } = validCitizenData;
      const res = await request(app)
        .post('/api/auth/register')
        .send(incompleteData);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors || res.body.message).toBeDefined();
    });

    it('should reject registration when password is missing or shorter than 6 characters', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          ...validCitizenData,
          password: '123'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors || res.body.message).toBeDefined();
    });

    it('should reject registration with an invalid role', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          ...validCitizenData,
          role: 'superadmin'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors || res.body.message).toBeDefined();
    });

    it('should reject malformed coordinates in location', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          ...validCitizenData,
          location: {
            latitude: 'invalid-coordinate'
          }
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('User Login (POST /api/auth/login)', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/register').send({
        fullName: 'Login User',
        name: 'Login User',
        email: 'user@example.com',
        password: 'ValidPassword123',
        role: 'CITIZEN'
      });
    });

    it('should successfully log in with valid credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'user@example.com',
        password: 'ValidPassword123'
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user.email).toBe('user@example.com');
      expect(res.body.data.user.password).toBeUndefined();
    });

    it('should reject login with incorrect password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'user@example.com',
        password: 'WrongPassword456'
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('should reject login with unknown email', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'unknown@example.com',
        password: 'ValidPassword123'
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('should reject login with missing credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: ''
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Current User Profile (GET /api/auth/me)', () => {
    let citizenToken;
    let registeredUser;

    beforeEach(async () => {
      const regRes = await request(app).post('/api/auth/register').send({
        fullName: 'Test Me User',
        name: 'Test Me User',
        email: 'me@example.com',
        password: 'Password123!',
        role: 'CITIZEN',
        location: { city: 'Bengaluru', pincode: '560001' }
      });

      citizenToken = regRes.body.data.token;
      registeredUser = regRes.body.data.user;
    });

    it('should return 401 when token is missing', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/(token.*required|no token provided)/i);
    });

    it('should return 401 when token is invalid', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.value');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/(invalid.*token|invalid token)/i);
    });

    it('should return 401 when token has expired', async () => {
      const expiredToken = jwt.sign(
        { id: registeredUser._id || registeredUser.id, email: registeredUser.email, role: 'CITIZEN' },
        process.env.JWT_SECRET,
        { expiresIn: '-1s' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/(token.*expired|invalid token)/i);
    });

    it('should return authenticated user profile when token is valid', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${citizenToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('me@example.com');
      expect(res.body.data.user.fullName || res.body.data.user.name).toBe('Test Me User');
      expect(res.body.data.user.location.city).toBe('Bengaluru');
      expect(res.body.data.user.password).toBeUndefined();
    });
  });

  describe('Role Authorization Middleware', () => {
    let citizenToken;
    let officialToken;

    beforeEach(async () => {
      const citizenRes = await request(app).post('/api/auth/register').send({
        fullName: 'Citizen Bob',
        name: 'Citizen Bob',
        email: 'bob@example.com',
        password: 'Password123!',
        role: 'CITIZEN'
      });
      citizenToken = citizenRes.body.data.token;

      const officialRes = await request(app).post('/api/auth/register').send({
        fullName: 'Officer Alice',
        name: 'Officer Alice',
        email: 'alice@gov.org',
        password: 'Password123!',
        role: 'OFFICIAL'
      });
      officialToken = officialRes.body.data.token;
    });

    it('should reject access (403 Forbidden) when citizen tries to access official-only route', async () => {
      const res = await request(roleTestApp)
        .get('/test/official-only')
        .set('Authorization', `Bearer ${citizenToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Access denied');
    });

    it('should permit access (200 OK) when official accesses official-only route', async () => {
      const res = await request(roleTestApp)
        .get('/test/official-only')
        .set('Authorization', `Bearer ${officialToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Official access granted');
    });

    it('should permit access (200 OK) when citizen accesses citizen-only route', async () => {
      const res = await request(roleTestApp)
        .get('/test/citizen-only')
        .set('Authorization', `Bearer ${citizenToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Citizen access granted');
    });

    it('should reject unauthenticated request (401) to role-protected route', async () => {
      const res = await request(roleTestApp).get('/test/official-only');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/(token.*required|no token provided)/i);
    });
  });

  describe('Security Checks', () => {
    it('should never expose password or password hash across all auth responses', async () => {
      const regRes = await request(app).post('/api/auth/register').send({
        fullName: 'Security Test User',
        name: 'Security Test User',
        email: 'security@example.com',
        password: 'SuperSecretPassword123!',
        role: 'CITIZEN'
      });

      expect(regRes.body.data.user.password).toBeUndefined();
      expect(JSON.stringify(regRes.body)).not.toContain('SuperSecretPassword123!');

      const loginRes = await request(app).post('/api/auth/login').send({
        email: 'security@example.com',
        password: 'SuperSecretPassword123!'
      });

      expect(loginRes.body.data.user.password).toBeUndefined();
      expect(JSON.stringify(loginRes.body)).not.toContain('SuperSecretPassword123!');

      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${loginRes.body.data.token}`);

      expect(meRes.body.data.user.password).toBeUndefined();
      expect(JSON.stringify(meRes.body)).not.toContain('SuperSecretPassword123!');
    });
  });
});
