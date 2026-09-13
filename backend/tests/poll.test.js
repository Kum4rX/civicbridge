const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/user.model');
const Poll = require('../src/models/poll.model');
const Vote = require('../src/models/vote.model');

let mongoServer;
let citizenUser;
let citizenToken;
let otherCitizenUser;
let otherCitizenToken;
let thirdCitizenUser;
let thirdCitizenToken;
let officialUser;
let officialToken;

jest.setTimeout(60000);

beforeAll(async () => {
  process.env.JWT_SECRET = 'test_jwt_secret_key_milestone_3';
  process.env.JWT_EXPIRES_IN = '1h';
  if (require('fs').existsSync('C:\\Program Files\\MongoDB\\Server\\8.0\\bin\\mongod.exe')) {
    process.env.MONGOMS_SYSTEM_BINARY = 'C:\\Program Files\\MongoDB\\Server\\8.0\\bin\\mongod.exe';
  }

  try {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  } catch (err) {
    const testUri = process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/civix_test_polls';
    await mongoose.connect(testUri);
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  await User.deleteMany({});
  await Poll.deleteMany({});
  await Vote.deleteMany({});

  // Setup citizen 1
  const citizenRes = await request(app).post('/api/auth/register').send({
    fullName: 'Citizen One',
    name: 'Citizen One',
    email: 'citizen1@example.com',
    password: 'Password123!',
    role: 'CITIZEN',
    location: { city: 'Bengaluru', state: 'Karnataka', pincode: '560001' }
  });
  citizenUser = citizenRes.body.data.user;
  citizenUser._id = citizenUser.id || citizenUser._id;
  citizenToken = citizenRes.body.data.token;

  // Setup citizen 2
  const otherRes = await request(app).post('/api/auth/register').send({
    fullName: 'Citizen Two',
    name: 'Citizen Two',
    email: 'citizen2@example.com',
    password: 'Password123!',
    role: 'CITIZEN',
    location: { city: 'Mysuru', state: 'Karnataka', pincode: '570001' }
  });
  otherCitizenUser = otherRes.body.data.user;
  otherCitizenUser._id = otherCitizenUser.id || otherCitizenUser._id;
  otherCitizenToken = otherRes.body.data.token;

  // Setup citizen 3
  const thirdRes = await request(app).post('/api/auth/register').send({
    fullName: 'Citizen Three',
    name: 'Citizen Three',
    email: 'citizen3@example.com',
    password: 'Password123!',
    role: 'CITIZEN',
    location: { city: 'Bengaluru', state: 'Karnataka', pincode: '560002' }
  });
  thirdCitizenUser = thirdRes.body.data.user;
  thirdCitizenUser._id = thirdCitizenUser.id || thirdCitizenUser._id;
  thirdCitizenToken = thirdRes.body.data.token;

  // Setup official
  const officialRes = await request(app).post('/api/auth/register').send({
    fullName: 'Official User',
    name: 'Official User',
    email: 'official@gov.in',
    password: 'Password123!',
    role: 'OFFICIAL',
    location: { city: 'Bengaluru', state: 'Karnataka', pincode: '560001' }
  });
  officialUser = officialRes.body.data.user;
  officialUser._id = officialUser.id || officialUser._id;
  officialToken = officialRes.body.data.token;
});

describe('Civix Milestone 3: Polling & Feedback API Tests', () => {
  const validPollPayload = {
    title: 'Should we introduce dedicated cycling lanes on MG Road?',
    description: 'A community poll to gauge public sentiment on pedestrian and bicycle infrastructure upgrades.',
    category: 'Transportation',
    options: [
      { text: 'Yes, fully separated bicycle lanes' },
      { text: 'Yes, shared bus and cycle lanes' },
      { text: 'No, retain current lane layout' }
    ],
    location: {
      city: 'Bengaluru',
      state: 'Karnataka',
      address: 'MG Road Corridor',
      pincode: '560001'
    }
  };

  describe('Create Poll (POST /api/polls)', () => {
    it('should successfully create a poll as an authenticated citizen', async () => {
      const res = await request(app)
        .post('/api/polls')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send(validPollPayload);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.poll).toBeDefined();
      expect(res.body.data.poll.title).toBe(validPollPayload.title);
      expect(res.body.data.poll.category).toBe('Transportation');
      expect(res.body.data.poll.status).toBe('active');
      expect(res.body.data.poll.options.length).toBe(3);
      expect(res.body.data.poll.creator).toBeDefined();
      expect(res.body.data.poll.totalVotes).toBe(0);
    });

    it('should successfully create a poll with question and closingDate (Angular format)', async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const res = await request(app)
        .post('/api/polls')
        .set('Authorization', `Bearer ${officialToken}`)
        .send({
          question: 'Should the municipal waste collection schedule shift to evening hours?',
          description: 'Proposed sanitation timing reform.',
          category: 'Sanitation',
          options: [{ text: 'Morning (6 AM - 10 AM)' }, { text: 'Evening (5 PM - 9 PM)' }],
          targetLocation: { city: 'Bengaluru', state: 'Karnataka' },
          closingDate: futureDate
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.poll.title).toBe('Should the municipal waste collection schedule shift to evening hours?');
      expect(res.body.data.poll.options.length).toBe(2);
    });

    it('should reject poll creation without authentication', async () => {
      const res = await request(app).post('/api/polls').send(validPollPayload);

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject poll with title shorter than 5 characters', async () => {
      const res = await request(app)
        .post('/api/polls')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ ...validPollPayload, title: 'No' });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject poll with fewer than 2 options', async () => {
      const res = await request(app)
        .post('/api/polls')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ ...validPollPayload, options: [{ text: 'Only One Option' }] });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject poll with duplicate options', async () => {
      const res = await request(app)
        .post('/api/polls')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          ...validPollPayload,
          options: [{ text: 'Option A' }, { text: 'option a' }]
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject poll with empty option text', async () => {
      const res = await request(app)
        .post('/api/polls')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          ...validPollPayload,
          options: [{ text: 'Option A' }, { text: '   ' }]
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject poll with missing city or state in location', async () => {
      const res = await request(app)
        .post('/api/polls')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          ...validPollPayload,
          location: { city: '', state: 'Karnataka' }
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject poll with invalid category', async () => {
      const res = await request(app)
        .post('/api/polls')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ ...validPollPayload, category: 'SpaceTravel' });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Get Polls with Search, Filter & Pagination (GET /api/polls)', () => {
    beforeEach(async () => {
      // Seed 3 polls
      await request(app)
        .post('/api/polls')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          title: 'Solar panels on municipal buildings?',
          category: 'Environment',
          options: [{ text: 'Support' }, { text: 'Oppose' }],
          location: { city: 'Bengaluru', state: 'Karnataka' }
        });

      await request(app)
        .post('/api/polls')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          title: 'New primary healthcare clinic in Indiranagar?',
          category: 'Health',
          options: [{ text: 'Urgent' }, { text: 'Low Priority' }],
          location: { city: 'Bengaluru', state: 'Karnataka' }
        });

      await request(app)
        .post('/api/polls')
        .set('Authorization', `Bearer ${otherCitizenToken}`)
        .send({
          title: 'Heritage park restoration in Mysuru?',
          category: 'Environment',
          options: [{ text: 'Yes' }, { text: 'No' }],
          location: { city: 'Mysuru', state: 'Karnataka' }
        });
    });

    it('should return paginated polls for public view', async () => {
      const res = await request(app).get('/api/polls');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.polls.length).toBe(3);
      expect(res.body.data.pagination.total).toBe(3);
    });

    it('should search polls by keyword', async () => {
      const res = await request(app).get('/api/polls?search=Solar');

      expect(res.statusCode).toBe(200);
      expect(res.body.data.polls.length).toBe(1);
      expect(res.body.data.polls[0].title).toContain('Solar');
    });

    it('should filter polls by category', async () => {
      const res = await request(app).get('/api/polls?category=Environment');

      expect(res.statusCode).toBe(200);
      expect(res.body.data.polls.length).toBe(2);
    });

    it('should filter polls by city', async () => {
      const res = await request(app).get('/api/polls?city=Mysuru');

      expect(res.statusCode).toBe(200);
      expect(res.body.data.polls.length).toBe(1);
      expect(res.body.data.polls[0].title).toContain('Heritage');
    });

    it('should paginate correctly with limit and page', async () => {
      const res = await request(app).get('/api/polls?limit=2&page=1');

      expect(res.statusCode).toBe(200);
      expect(res.body.data.polls.length).toBe(2);
      expect(res.body.data.pagination.totalPages).toBe(2);
      expect(res.body.data.pagination.hasNextPage).toBe(true);
    });
  });

  describe('Get Poll by ID (GET /api/polls/:id)', () => {
    let createdPollId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/polls')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send(validPollPayload);
      createdPollId = res.body.data.poll.id || res.body.data.poll._id;
    });

    it('should retrieve a poll by valid ID with populated creator', async () => {
      const res = await request(app).get(`/api/polls/${createdPollId}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.poll.title).toBe(validPollPayload.title);
      expect(res.body.data.poll.creator.email).toBe('citizen1@example.com');
    });

    it('should return 404 for non-existent poll ID', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/polls/${fakeId}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for malformed poll ID', async () => {
      const res = await request(app).get('/api/polls/invalid-id-format');

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Voting on Poll (POST /api/polls/:id/vote)', () => {
    let pollId;
    let option1Id;
    let option2Id;

    beforeEach(async () => {
      const pollRes = await request(app)
        .post('/api/polls')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send(validPollPayload);

      pollId = pollRes.body.data.poll.id || pollRes.body.data.poll._id;
      option1Id = pollRes.body.data.poll.options[0].id || pollRes.body.data.poll.options[0]._id;
      option2Id = pollRes.body.data.poll.options[1].id || pollRes.body.data.poll.options[1]._id;
    });

    it('should successfully record a vote as an authenticated citizen', async () => {
      const res = await request(app)
        .post(`/api/polls/${pollId}/vote`)
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ optionId: option1Id });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.poll.totalVotes).toBe(1);
      expect(res.body.data.vote).toBeDefined();
    });

    it('should allow multiple different citizens to vote on the poll', async () => {
      // Citizen 1 votes for option 1
      await request(app)
        .post(`/api/polls/${pollId}/vote`)
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ optionId: option1Id });

      // Citizen 2 votes for option 2
      const res2 = await request(app)
        .post(`/api/polls/${pollId}/vote`)
        .set('Authorization', `Bearer ${otherCitizenToken}`)
        .send({ optionId: option2Id });

      expect(res2.statusCode).toBe(200);
      expect(res2.body.data.poll.totalVotes).toBe(2);

      // Official user votes for option 1
      const res3 = await request(app)
        .post(`/api/polls/${pollId}/vote`)
        .set('Authorization', `Bearer ${officialToken}`)
        .send({ selectedOption: option1Id });

      expect(res3.statusCode).toBe(200);
      expect(res3.body.data.poll.totalVotes).toBe(3);
    });

    it('should reject unauthenticated voting request (401)', async () => {
      const res = await request(app)
        .post(`/api/polls/${pollId}/vote`)
        .send({ optionId: option1Id });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject duplicate vote from the same user (400)', async () => {
      // First vote succeeds
      await request(app)
        .post(`/api/polls/${pollId}/vote`)
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ optionId: option1Id });

      // Second vote must be rejected
      const duplicateRes = await request(app)
        .post(`/api/polls/${pollId}/vote`)
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ optionId: option2Id });

      expect(duplicateRes.statusCode).toBe(400);
      expect(duplicateRes.body.success).toBe(false);
      expect(duplicateRes.body.message).toContain('already voted');
    });

    it('should reject vote with an invalid option ID that does not belong to the poll (400)', async () => {
      const fakeOptionId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post(`/api/polls/${pollId}/vote`)
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ optionId: fakeOptionId });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid option');
    });

    it('should reject voting on a closed poll (400)', async () => {
      // Close the poll first
      await request(app)
        .patch(`/api/polls/${pollId}/status`)
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ status: 'closed' });

      const res = await request(app)
        .post(`/api/polls/${pollId}/vote`)
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ optionId: option1Id });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('closed');
    });
  });

  describe('Live Poll Results & Dynamic Sentiment Analytics (GET /api/polls/:id/results)', () => {
    let pollId;
    let opt1Id;
    let opt2Id;
    let opt3Id;

    beforeEach(async () => {
      const pollRes = await request(app)
        .post('/api/polls')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send(validPollPayload);

      pollId = pollRes.body.data.poll.id || pollRes.body.data.poll._id;
      opt1Id = pollRes.body.data.poll.options[0].id || pollRes.body.data.poll.options[0]._id;
      opt2Id = pollRes.body.data.poll.options[1].id || pollRes.body.data.poll.options[1]._id;
      opt3Id = pollRes.body.data.poll.options[2].id || pollRes.body.data.poll.options[2]._id;
    });

    it('should return zero votes and 0% for all options when no votes cast', async () => {
      const res = await request(app).get(`/api/polls/${pollId}/results`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalVotes).toBe(0);
      expect(res.body.data.options.length).toBe(3);
      expect(res.body.data.options[0].votes).toBe(0);
      expect(res.body.data.options[0].percentage).toBe(0);
    });

    it('should calculate accurate live counts and dynamic percentages from database votes', async () => {
      // Citizen 1 votes for option 1
      await request(app)
        .post(`/api/polls/${pollId}/vote`)
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ optionId: opt1Id });

      // Citizen 2 votes for option 1
      await request(app)
        .post(`/api/polls/${pollId}/vote`)
        .set('Authorization', `Bearer ${otherCitizenToken}`)
        .send({ optionId: opt1Id });

      // Citizen 3 votes for option 2
      await request(app)
        .post(`/api/polls/${pollId}/vote`)
        .set('Authorization', `Bearer ${thirdCitizenToken}`)
        .send({ optionId: opt2Id });

      // Official votes for option 1
      await request(app)
        .post(`/api/polls/${pollId}/vote`)
        .set('Authorization', `Bearer ${officialToken}`)
        .send({ optionId: opt1Id });

      // Total votes: 4 (Option 1: 3 votes = 75.0%, Option 2: 1 vote = 25.0%, Option 3: 0 votes = 0.0%)
      const res = await request(app).get(`/api/polls/${pollId}/results`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalVotes).toBe(4);

      const opt1Result = res.body.data.options.find((o) => o.id === opt1Id.toString());
      const opt2Result = res.body.data.options.find((o) => o.id === opt2Id.toString());
      const opt3Result = res.body.data.options.find((o) => o.id === opt3Id.toString());

      expect(opt1Result.votes).toBe(3);
      expect(opt1Result.percentage).toBe(75);

      expect(opt2Result.votes).toBe(1);
      expect(opt2Result.percentage).toBe(25);

      expect(opt3Result.votes).toBe(0);
      expect(opt3Result.percentage).toBe(0);
    });

    it('should return 404 for results on non-existent poll ID', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/polls/${fakeId}/results`);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Poll Status & Permissions (PATCH /api/polls/:id/status)', () => {
    let pollId;

    beforeEach(async () => {
      const pollRes = await request(app)
        .post('/api/polls')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send(validPollPayload);
      pollId = pollRes.body.data.poll.id || pollRes.body.data.poll._id;
    });

    it('should allow the poll creator to close their active poll', async () => {
      const res = await request(app)
        .patch(`/api/polls/${pollId}/status`)
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ status: 'closed' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.poll.status).toBe('closed');
    });

    it('should allow an official to close any active poll', async () => {
      const res = await request(app)
        .patch(`/api/polls/${pollId}/status`)
        .set('Authorization', `Bearer ${officialToken}`)
        .send({ status: 'closed' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.poll.status).toBe('closed');
    });

    it('should reject non-creator citizen from changing poll status (403 Forbidden)', async () => {
      const res = await request(app)
        .patch(`/api/polls/${pollId}/status`)
        .set('Authorization', `Bearer ${otherCitizenToken}`)
        .send({ status: 'closed' });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject unauthenticated request from changing poll status (401)', async () => {
      const res = await request(app)
        .patch(`/api/polls/${pollId}/status`)
        .send({ status: 'closed' });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
