const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/user.model');
const Petition = require('../src/models/petition.model');
const Poll = require('../src/models/poll.model');
const Vote = require('../src/models/vote.model');
const AdminLog = require('../src/models/admin-log.model');

let mongoServer;
let citizenToken;
let citizenUser;
let officialToken;
let officialUser;

jest.setTimeout(60000);

beforeAll(async () => {
  process.env.JWT_SECRET = 'test_jwt_secret_key_milestone_4_reports';
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
  await Petition.deleteMany({});
  await Poll.deleteMany({});
  await Vote.deleteMany({});
  await AdminLog.deleteMany({});

  // 1. Citizen
  const citRes = await request(app).post('/api/auth/register').send({
    fullName: 'Citizen Reporter',
    email: 'citizen_rep@test.com',
    password: 'Password123!',
    role: 'CITIZEN',
    location: { city: 'Bengaluru', state: 'Karnataka' }
  });
  citizenToken = citRes.body.data.token;
  citizenUser = citRes.body.data.user;

  // 2. Official
  const offRes = await request(app).post('/api/auth/register').send({
    fullName: 'Official Reporter',
    email: 'official_rep@test.com',
    password: 'Password123!',
    role: 'OFFICIAL',
    location: { city: 'Bengaluru', state: 'Karnataka' }
  });
  officialToken = offRes.body.data.token;
  officialUser = offRes.body.data.user;

  // 3. Seed real test data
  // Petitions
  await Petition.create([
    {
      title: 'Solar Lighting in Public Parks',
      description: 'Requesting installation of solar LED lighting in public municipal parks.',
      category: 'Environment',
      signaturesCount: 15,
      targetSignatures: 100,
      status: 'active',
      location: { city: 'Bengaluru', state: 'Karnataka' },
      creator: citizenUser.id || citizenUser._id
    },
    {
      title: 'Pothole Resurfacing in Indiranagar',
      description: 'Heavy damage to Indiranagar 100ft road requires asphalt resurfacing.',
      category: 'Infrastructure',
      signaturesCount: 25,
      targetSignatures: 100,
      status: 'under_review',
      location: { city: 'Bengaluru', state: 'Karnataka' },
      creator: citizenUser.id || citizenUser._id,
      responses: [
        {
          official: officialUser.id || officialUser._id,
          officialName: 'Official Reporter',
          message: 'Inspection completed; tenders scheduled.',
          createdAt: new Date()
        }
      ]
    },
    {
      title: 'Old Town Water Supply Maintenance',
      description: 'Scheduled maintenance of overhead reservoirs completed.',
      category: 'Sanitation',
      signaturesCount: 50,
      targetSignatures: 50,
      status: 'closed',
      location: { city: 'Bengaluru', state: 'Karnataka' },
      creator: citizenUser.id || citizenUser._id
    }
  ]);

  // Poll
  const poll = await Poll.create({
    title: 'Weekend Car-Free Zones on Commercial Street?',
    description: 'Public referendum on weekend pedestrianisation.',
    category: 'Transportation',
    options: [
      { text: 'Yes, full pedestrianisation', votesCount: 2 },
      { text: 'No, keep vehicular access', votesCount: 1 }
    ],
    targetLocation: { city: 'Bengaluru', state: 'Karnataka' },
    creator: officialUser.id || officialUser._id,
    status: 'active',
    totalVotes: 3
  });

  // Votes
  await Vote.create([
    {
      poll: poll._id,
      user: citizenUser.id || citizenUser._id,
      selectedOption: poll.options[0]._id,
      optionText: 'Yes, full pedestrianisation'
    }
  ]);
});

describe('Milestone 4 - Monthly Reports Summary API', () => {
  it('should return real aggregated summary metrics from MongoDB', async () => {
    const res = await request(app).get('/api/reports/summary');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const summary = res.body.data;
    expect(summary.totalPetitions).toBe(3);
    expect(summary.activePetitions).toBe(1);
    expect(summary.underReviewPetitions).toBe(1);
    expect(summary.closedPetitions).toBe(1);
    expect(summary.totalSignatures).toBe(90); // 15 + 25 + 50
    expect(summary.totalPolls).toBe(1);
    expect(summary.totalVotes).toBe(3);
    expect(summary.totalResponses).toBe(1);
  });

  it('should support locality filtering in summary', async () => {
    const blrRes = await request(app).get('/api/reports/summary?city=Bengaluru');
    expect(blrRes.status).toBe(200);
    expect(blrRes.body.data.totalPetitions).toBe(3);

    const mysRes = await request(app).get('/api/reports/summary?city=Mysuru');
    expect(mysRes.status).toBe(200);
    expect(mysRes.body.data.totalPetitions).toBe(0);
  });

  it('should reject invalid month and year parameters', async () => {
    const res = await request(app).get('/api/reports/summary?month=15&year=2026');
    expect(res.status).toBe(400);
  });
});

describe('Milestone 4 - Detailed Petition Reports', () => {
  it('should return petition breakdown by status, category, and locality', async () => {
    const res = await request(app).get('/api/reports/petitions');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.byStatus).toBeInstanceOf(Array);
    expect(res.body.data.byCategory).toBeInstanceOf(Array);
    expect(res.body.data.byLocality).toBeInstanceOf(Array);
    expect(res.body.data.monthly).toBeInstanceOf(Array);

    const categories = res.body.data.byCategory.map((c) => c.label);
    expect(categories).toContain('Environment');
    expect(categories).toContain('Infrastructure');
    expect(categories).toContain('Sanitation');
  });
});

describe('Milestone 4 - Detailed Poll Reports', () => {
  it('should return real poll statistics using Milestone 3 data', async () => {
    const res = await request(app).get('/api/reports/polls');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.byStatus).toBeInstanceOf(Array);
    expect(res.body.data.byCategory).toBeInstanceOf(Array);
    expect(res.body.data.participation).toBeInstanceOf(Array);
    expect(res.body.data.participation[0].label).toContain('Weekend Car-Free');
    expect(res.body.data.participation[0].value).toBe(3);
  });
});

describe('Milestone 4 - Sentiment / Trend Series', () => {
  it('should return real dynamic time-series of votes for frontend charts', async () => {
    const res = await request(app).get('/api/reports/sentiment');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0]).toHaveProperty('month');
    expect(res.body.data[0]).toHaveProperty('votes');
  });
});

describe('Milestone 4 - Report Export API', () => {
  it('should generate and stream a downloadable CSV report', async () => {
    const res = await request(app)
      .get('/api/reports/export?format=csv')
      .set('Authorization', `Bearer ${officialToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.headers['content-disposition']).toContain('civicbridge-report-');

    const csvText = res.text;
    expect(csvText).toContain('CIVICBRIDGE CIVIC ENGAGEMENT REPORT');
    expect(csvText).toContain('EXECUTIVE SUMMARY');
    expect(csvText).toContain('Total Petitions,3');
    expect(csvText).toContain('Total Signatures,90');
    expect(csvText).toContain('Total Poll Votes,3');
    expect(csvText).toContain('PETITIONS BY STATUS');
    expect(csvText).toContain('POLL PARTICIPATION');

    // Verify AdminLog record created
    const log = await AdminLog.findOne({ action: 'REPORT_EXPORTED' });
    expect(log).not.toBeNull();
    expect(log.userId.toString()).toBe(officialUser.id || officialUser._id);
  });
});
