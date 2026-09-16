const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/user.model');
const Petition = require('../src/models/petition.model');
const Signature = require('../src/models/signature.model');
const AdminLog = require('../src/models/admin-log.model');

let mongoServer;
let citizenToken;
let citizenUser;
let officialBlrToken;
let officialBlrUser;
let officialMysToken;
let officialMysUser;

jest.setTimeout(60000);

beforeAll(async () => {
  process.env.JWT_SECRET = 'test_jwt_secret_key_milestone_4';
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
  await Signature.deleteMany({});
  await AdminLog.deleteMany({});

  // 1. Citizen user in Bengaluru
  const citRes = await request(app).post('/api/auth/register').send({
    fullName: 'Citizen Bengaluru',
    email: 'citizen_blr@test.com',
    password: 'Password123!',
    role: 'CITIZEN',
    location: { city: 'Bengaluru', state: 'Karnataka', pincode: '560001' }
  });
  citizenToken = citRes.body.data.token;
  citizenUser = citRes.body.data.user;

  // 2. Official user in Bengaluru
  const offBlrRes = await request(app).post('/api/auth/register').send({
    fullName: 'Official Bengaluru',
    email: 'official_blr@test.com',
    password: 'Password123!',
    role: 'OFFICIAL',
    location: { city: 'Bengaluru', state: 'Karnataka', pincode: '560001' }
  });
  officialBlrToken = offBlrRes.body.data.token;
  officialBlrUser = offBlrRes.body.data.user;

  // 3. Official user in Mysuru (different locality)
  const offMysRes = await request(app).post('/api/auth/register').send({
    fullName: 'Official Mysuru',
    email: 'official_mys@test.com',
    password: 'Password123!',
    role: 'OFFICIAL',
    location: { city: 'Mysuru', state: 'Karnataka', pincode: '570001' }
  });
  officialMysToken = offMysRes.body.data.token;
  officialMysUser = offMysRes.body.data.user;
});

describe('Milestone 4 - Governance Locality & Official Petitions', () => {
  it('should reject unauthenticated access to governance petitions', async () => {
    const res = await request(app).get('/api/governance/petitions');
    expect(res.status).toBe(401);
  });

  it('should reject citizen access to governance petitions', async () => {
    const res = await request(app)
      .get('/api/governance/petitions')
      .set('Authorization', `Bearer ${citizenToken}`);
    expect(res.status).toBe(403);
  });

  it('should allow official to list petitions in their locality', async () => {
    // Create petition in Bengaluru
    await request(app)
      .post('/api/petitions')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        title: 'Fix Koramangala Potholes',
        description: 'Urgent road resurfacing required in Koramangala 4th Block.',
        category: 'Infrastructure',
        targetSignatures: 100,
        location: { city: 'Bengaluru', state: 'Karnataka', address: 'Koramangala' }
      });

    // Create petition in Mysuru
    await request(app)
      .post('/api/petitions')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        title: 'Mysuru Palace Heritage Light Restoration',
        description: 'Preserve nighttime illumination surrounding the palace perimeter.',
        category: 'Environment',
        targetSignatures: 100,
        location: { city: 'Mysuru', state: 'Karnataka', address: 'Palace Road' }
      });

    // Bengaluru official queries governance petitions
    const res = await request(app)
      .get('/api/governance/petitions')
      .set('Authorization', `Bearer ${officialBlrToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.petitions).toHaveLength(1);
    expect(res.body.data.petitions[0].title).toBe('Fix Koramangala Potholes');
    expect(res.body.data.locality.city).toBe('Bengaluru');
  });
});

describe('Milestone 4 - Official Governance Responses', () => {
  let blrPetitionId;

  beforeEach(async () => {
    const petRes = await request(app)
      .post('/api/petitions')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        title: 'Sanitation Drive in Ward 12',
        description: 'Requesting waste segregation drives and timely collection in Ward 12.',
        category: 'Sanitation',
        targetSignatures: 100,
        location: { city: 'Bengaluru', state: 'Karnataka' }
      });
    blrPetitionId = petRes.body.data.petition._id || petRes.body.data.petition.id;
  });

  it('should allow authorized locality official to submit response and update status', async () => {
    const res = await request(app)
      .post(`/api/petitions/${blrPetitionId}/response`)
      .set('Authorization', `Bearer ${officialBlrToken}`)
      .send({
        message: 'The municipal corporation has scheduled sanitation drives starting next week.',
        status: 'under_review'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.response.message).toContain('scheduled sanitation drives');
    expect(res.body.data.petition.status).toBe('under_review');
    expect(res.body.data.petition.responses).toHaveLength(1);

    // Verify detail endpoint displays the response
    const detailRes = await request(app).get(`/api/petitions/${blrPetitionId}`);
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.data.petition.responses).toHaveLength(1);
    expect(detailRes.body.data.petition.status).toBe('under_review');
  });

  it('should reject citizen attempt to post official response', async () => {
    const res = await request(app)
      .post(`/api/petitions/${blrPetitionId}/response`)
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        message: 'I am a citizen trying to post an official response.'
      });

    expect(res.status).toBe(403);
  });

  it('should reject response from official of an unrelated locality', async () => {
    const res = await request(app)
      .post(`/api/petitions/${blrPetitionId}/response`)
      .set('Authorization', `Bearer ${officialMysToken}`)
      .send({
        message: 'Mysuru official trying to respond to Bengaluru petition.'
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('locality');
  });

  it('should validate comment length', async () => {
    const res = await request(app)
      .post(`/api/petitions/${blrPetitionId}/response`)
      .set('Authorization', `Bearer ${officialBlrToken}`)
      .send({
        message: 'Hi'
      });

    expect(res.status).toBe(400);
  });
});

describe('Milestone 4 - Petition Status Updates', () => {
  let blrPetitionId;

  beforeEach(async () => {
    const petRes = await request(app)
      .post('/api/petitions')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        title: 'Install Traffic Signal at Junction',
        description: 'High accident rate at the 5th Main junction requires urgent traffic signals.',
        category: 'Public Safety',
        targetSignatures: 100,
        location: { city: 'Bengaluru', state: 'Karnataka' }
      });
    blrPetitionId = petRes.body.data.petition._id || petRes.body.data.petition.id;
  });

  it('should allow official to transition status from active to under_review to closed', async () => {
    // 1. active -> under_review
    const res1 = await request(app)
      .patch(`/api/petitions/${blrPetitionId}/status`)
      .set('Authorization', `Bearer ${officialBlrToken}`)
      .send({ status: 'under_review' });

    expect(res1.status).toBe(200);
    expect(res1.body.data.previousStatus).toBe('active');
    expect(res1.body.data.newStatus).toBe('under_review');
    expect(res1.body.data.petition.status).toBe('under_review');

    // 2. under_review -> closed
    const res2 = await request(app)
      .patch(`/api/petitions/${blrPetitionId}/status`)
      .set('Authorization', `Bearer ${officialBlrToken}`)
      .send({ status: 'closed' });

    expect(res2.status).toBe(200);
    expect(res2.body.data.previousStatus).toBe('under_review');
    expect(res2.body.data.newStatus).toBe('closed');
    expect(res2.body.data.petition.status).toBe('closed');
  });

  it('should reject invalid status value', async () => {
    const res = await request(app)
      .patch(`/api/petitions/${blrPetitionId}/status`)
      .set('Authorization', `Bearer ${officialBlrToken}`)
      .send({ status: 'invalid_status_xyz' });

    expect(res.status).toBe(400);
  });

  it('should reject non-official attempt to update status', async () => {
    const res = await request(app)
      .patch(`/api/petitions/${blrPetitionId}/status`)
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({ status: 'closed' });

    expect(res.status).toBe(403);
  });
});

describe('Milestone 4 - Petition Signing & Signed Petitions', () => {
  let petitionId;

  beforeEach(async () => {
    const petRes = await request(app)
      .post('/api/petitions')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        title: 'New Community Library Support',
        description: 'Support establishing a civic library and study hub in our neighbourhood.',
        category: 'Education',
        targetSignatures: 50,
        location: { city: 'Bengaluru', state: 'Karnataka' }
      });
    petitionId = petRes.body.data.petition._id || petRes.body.data.petition.id;
  });

  it('should allow citizen to sign an active petition', async () => {
    const signRes = await request(app)
      .post(`/api/petitions/${petitionId}/sign`)
      .set('Authorization', `Bearer ${citizenToken}`)
      .send();

    expect(signRes.status).toBe(200);
    expect(signRes.body.success).toBe(true);
    expect(signRes.body.data.petition.signaturesCount).toBe(1);
    expect(signRes.body.data.petition.hasSigned).toBe(true);
  });

  it('should reject duplicate signature from same user', async () => {
    await request(app)
      .post(`/api/petitions/${petitionId}/sign`)
      .set('Authorization', `Bearer ${citizenToken}`)
      .send();

    const dupRes = await request(app)
      .post(`/api/petitions/${petitionId}/sign`)
      .set('Authorization', `Bearer ${citizenToken}`)
      .send();

    expect(dupRes.status).toBe(400);
    expect(dupRes.body.message).toContain('already signed');
  });

  it('should list signed petitions on GET /api/petitions/signed', async () => {
    await request(app)
      .post(`/api/petitions/${petitionId}/sign`)
      .set('Authorization', `Bearer ${citizenToken}`)
      .send();

    const signedRes = await request(app)
      .get('/api/petitions/signed')
      .set('Authorization', `Bearer ${citizenToken}`);

    expect(signedRes.status).toBe(200);
    expect(signedRes.body.success).toBe(true);
    expect(signedRes.body.data.petitions).toHaveLength(1);
    expect(signedRes.body.data.petitions[0].title).toBe('New Community Library Support');
    expect(signedRes.body.data.petitions[0].hasSigned).toBe(true);
  });
});
