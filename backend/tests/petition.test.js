const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/user.model');
const Petition = require('../src/models/petition.model');

let mongoServer;
let citizenUser;
let citizenToken;
let otherCitizenUser;
let otherCitizenToken;
let officialUser;
let officialToken;

jest.setTimeout(60000);

beforeAll(async () => {
  process.env.JWT_SECRET = 'test_jwt_secret_key_milestone_2';
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

  // Setup official
  const officialRes = await request(app).post('/api/auth/register').send({
    fullName: 'Officer One',
    name: 'Officer One',
    email: 'officer@gov.org',
    password: 'Password123!',
    role: 'OFFICIAL',
    location: { city: 'Bengaluru', state: 'Karnataka' }
  });
  officialUser = officialRes.body.data.user;
  officialUser._id = officialUser.id || officialUser._id;
  officialToken = officialRes.body.data.token;
});

describe('Civix Milestone 2: Petition Creation & Management API Tests', () => {
  const validPetitionPayload = {
    title: 'Fix Main Street Potholes and Improve Road Safety',
    description: 'The potholes on Main Street from 1st Cross to 5th Block have become dangerous for commuters and pedestrians.',
    category: 'Infrastructure',
    tags: ['roads', 'safety', 'infrastructure'],
    targetSignatures: 250,
    location: {
      address: 'Main Street, Koramangala',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560034',
      latitude: 12.9352,
      longitude: 77.6245
    }
  };

  describe('Create Petition (POST /api/petitions)', () => {
    it('should successfully create a petition as an authenticated citizen', async () => {
      const res = await request(app)
        .post('/api/petitions')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send(validPetitionPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.petition).toBeDefined();
      expect(res.body.data.petition.title).toBe(validPetitionPayload.title);
      expect(res.body.data.petition.category).toBe('Infrastructure');
      expect(res.body.data.petition.signaturesCount).toBe(0);
      expect(res.body.data.petition.status).toBe('active');
      expect(res.body.data.petition.creator).toBeDefined();
      expect(res.body.data.petition.creator.password).toBeUndefined();
    });

    it('should successfully create a petition as an official', async () => {
      const res = await request(app)
        .post('/api/petitions')
        .set('Authorization', `Bearer ${officialToken}`)
        .send({
          ...validPetitionPayload,
          title: 'Official Civic Initiative on Water Conservation',
          category: 'Environment'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.petition.category).toBe('Environment');
      expect(res.body.data.petition.creator.role).toBe('OFFICIAL');
    });

    it('should reject petition creation without authentication', async () => {
      const res = await request(app)
        .post('/api/petitions')
        .send(validPetitionPayload);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject petition with title shorter than 5 characters', async () => {
      const res = await request(app)
        .post('/api/petitions')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          ...validPetitionPayload,
          title: 'Fix'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });

    it('should reject petition with description shorter than 20 characters', async () => {
      const res = await request(app)
        .post('/api/petitions')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          ...validPetitionPayload,
          description: 'Too short.'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });

    it('should reject petition with invalid category', async () => {
      const res = await request(app)
        .post('/api/petitions')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          ...validPetitionPayload,
          category: 'InvalidCategory'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });

    it('should reject petition with missing location city or state', async () => {
      const res = await request(app)
        .post('/api/petitions')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          ...validPetitionPayload,
          location: {
            address: '123 Test St'
          }
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });
  });

  describe('Get Petitions with Search, Filter & Pagination (GET /api/petitions)', () => {
    beforeEach(async () => {
      // Seed petitions
      await Petition.create([
        {
          title: 'Install Solar Street Lights in Residential Sector',
          description: 'Dark streets in Sector 4 are causing safety issues at night. Solar lights are sustainable.',
          category: 'Environment',
          tags: ['solar', 'lighting', 'green'],
          targetSignatures: 100,
          location: { city: 'Bengaluru', state: 'Karnataka' },
          creator: citizenUser._id,
          status: 'active'
        },
        {
          title: 'Construct Footbridge near City Central Metro Station',
          description: 'Pedestrians face high traffic danger when crossing the avenue outside Central Metro.',
          category: 'Transportation',
          tags: ['bridge', 'metro', 'pedestrian'],
          targetSignatures: 500,
          location: { city: 'Bengaluru', state: 'Karnataka' },
          creator: citizenUser._id,
          status: 'active'
        },
        {
          title: 'Improve Waste Segregation & Collection in Heritage Zone',
          description: 'Heritage zone requires regular waste management and recycling bins for tourists.',
          category: 'Sanitation',
          tags: ['waste', 'recycling', 'heritage'],
          targetSignatures: 150,
          location: { city: 'Mysuru', state: 'Karnataka' },
          creator: otherCitizenUser._id,
          status: 'active'
        },
        {
          title: 'Draft Community Initiative for Local Library',
          description: 'This is a draft proposal for neighborhood reading rooms and digital library.',
          category: 'Education',
          tags: ['library', 'books'],
          targetSignatures: 50,
          location: { city: 'Bengaluru', state: 'Karnataka' },
          creator: citizenUser._id,
          status: 'draft'
        }
      ]);
    });

    it('should return paginated active petitions for public view', async () => {
      const res = await request(app).get('/api/petitions?page=1&limit=10');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.petitions.length).toBe(3); // 3 active, 1 draft excluded
      expect(res.body.data.pagination.total).toBe(3);
      expect(res.body.data.pagination.page).toBe(1);
    });

    it('should search petitions by keyword', async () => {
      const res = await request(app).get('/api/petitions?search=metro');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.petitions.length).toBe(1);
      expect(res.body.data.petitions[0].title).toContain('Footbridge');
    });

    it('should filter petitions by category', async () => {
      const res = await request(app).get('/api/petitions?category=Sanitation');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.petitions.length).toBe(1);
      expect(res.body.data.petitions[0].category).toBe('Sanitation');
    });

    it('should filter petitions by city', async () => {
      const res = await request(app).get('/api/petitions?city=Mysuru');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.petitions.length).toBe(1);
      expect(res.body.data.petitions[0].location.city).toBe('Mysuru');
    });

    it('should filter petitions by tag', async () => {
      const res = await request(app).get('/api/petitions?tag=solar');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.petitions.length).toBe(1);
      expect(res.body.data.petitions[0].tags).toContain('solar');
    });

    it('should paginate correctly with limit and page', async () => {
      const res = await request(app).get('/api/petitions?page=1&limit=2');

      expect(res.status).toBe(200);
      expect(res.body.data.petitions.length).toBe(2);
      expect(res.body.data.pagination.totalPages).toBe(2);
      expect(res.body.data.pagination.hasNextPage).toBe(true);
    });
  });

  describe('Get My Petitions (GET /api/petitions/my)', () => {
    beforeEach(async () => {
      await Petition.create([
        {
          title: 'My Active Petition for Road Repair Work',
          description: 'A comprehensive petition for repairing community roads in Ward 10.',
          category: 'Infrastructure',
          location: { city: 'Bengaluru', state: 'Karnataka' },
          creator: citizenUser._id,
          status: 'active'
        },
        {
          title: 'My Draft Petition for Public Park Benches',
          description: 'Draft proposal to install new senior-friendly benches in neighborhood park.',
          category: 'Environment',
          location: { city: 'Bengaluru', state: 'Karnataka' },
          creator: citizenUser._id,
          status: 'draft'
        },
        {
          title: 'Other User Petition on Hospital Upgrades',
          description: 'Upgrade emergency ward facilities at local healthcare clinic.',
          category: 'Health',
          location: { city: 'Mysuru', state: 'Karnataka' },
          creator: otherCitizenUser._id,
          status: 'active'
        }
      ]);
    });

    it('should return all petitions created by the authenticated user including drafts', async () => {
      const res = await request(app)
        .get('/api/petitions/my')
        .set('Authorization', `Bearer ${citizenToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.petitions.length).toBe(2);
      expect(res.body.data.pagination.total).toBe(2);
    });

    it('should reject unauthenticated request to my petitions', async () => {
      const res = await request(app).get('/api/petitions/my');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Get Petition by ID (GET /api/petitions/:id)', () => {
    let createdPetition;

    beforeEach(async () => {
      createdPetition = await Petition.create({
        title: 'Community Cleanliness Drive in Ward 12',
        description: 'Organizing bi-weekly civic volunteer drives for waste clearing and segregation.',
        category: 'Sanitation',
        tags: ['clean', 'community'],
        targetSignatures: 100,
        location: { city: 'Bengaluru', state: 'Karnataka' },
        creator: citizenUser._id,
        status: 'active'
      });
    });

    it('should retrieve a petition by valid ID with populated creator', async () => {
      const res = await request(app).get(`/api/petitions/${createdPetition._id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.petition._id).toBe(createdPetition._id.toString());
      expect(res.body.data.petition.creator).toBeDefined();
      expect(res.body.data.petition.creator.password).toBeUndefined();
    });

    it('should return 404 for non-existent petition ID', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/petitions/${nonExistentId}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Petition not found');
    });

    it('should return 400 for malformed petition ID', async () => {
      const res = await request(app).get('/api/petitions/not-a-valid-id');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Edit Petition Restrictions (PUT /api/petitions/:id)', () => {
    let petitionWithZeroSignatures;
    let petitionWithSignatures;

    beforeEach(async () => {
      petitionWithZeroSignatures = await Petition.create({
        title: 'Initial Title for Playground Renovation',
        description: 'Playground renovation required for community children in Block B.',
        category: 'Infrastructure',
        targetSignatures: 100,
        signaturesCount: 0,
        location: { city: 'Bengaluru', state: 'Karnataka' },
        creator: citizenUser._id,
        status: 'active'
      });

      petitionWithSignatures = await Petition.create({
        title: 'Petition That Already Has Received Signatures',
        description: 'This petition already gained civic momentum and gathered community signatures.',
        category: 'Public Safety',
        targetSignatures: 200,
        signaturesCount: 15, // Signatures already present
        location: { city: 'Bengaluru', state: 'Karnataka' },
        creator: citizenUser._id,
        status: 'active'
      });
    });

    it('should allow the creator to edit their petition before signatures (signaturesCount === 0)', async () => {
      const res = await request(app)
        .put(`/api/petitions/${petitionWithZeroSignatures._id}`)
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          title: 'Updated Title for Playground & Sports Equipment Renovation',
          description: 'Updated description: comprehensive equipment and safety mats needed.',
          category: 'Infrastructure',
          tags: ['playground', 'sports', 'kids']
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.petition.title).toContain('Sports Equipment');
      expect(res.body.data.petition.tags).toContain('playground');
    });

    it('should reject edit by a non-creator (403 Forbidden)', async () => {
      const res = await request(app)
        .put(`/api/petitions/${petitionWithZeroSignatures._id}`)
        .set('Authorization', `Bearer ${otherCitizenToken}`)
        .send({
          title: 'Unauthorized Edit Attempt by Other Citizen'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('not authorized');
    });

    it('should reject edit when petition already has signatures (signaturesCount > 0)', async () => {
      const res = await request(app)
        .put(`/api/petitions/${petitionWithSignatures._id}`)
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          title: 'Attempting to Modify Petition After Community Signatures'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Cannot edit a petition that has already received signatures');
    });

    it('should reject unauthenticated edit request (401)', async () => {
      const res = await request(app)
        .put(`/api/petitions/${petitionWithZeroSignatures._id}`)
        .send({
          title: 'Unauthenticated update'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Delete Petition Restrictions (DELETE /api/petitions/:id)', () => {
    let petitionWithZeroSignatures;
    let petitionWithSignatures;

    beforeEach(async () => {
      petitionWithZeroSignatures = await Petition.create({
        title: 'Draft to be Deleted Before Any Public Activity',
        description: 'This petition was created mistakenly and is now marked for deletion.',
        category: 'Other',
        signaturesCount: 0,
        location: { city: 'Bengaluru', state: 'Karnataka' },
        creator: citizenUser._id,
        status: 'draft'
      });

      petitionWithSignatures = await Petition.create({
        title: 'Active Petition With Community Signatures',
        description: 'This petition has active citizen backers and cannot be deleted.',
        category: 'Environment',
        signaturesCount: 50,
        location: { city: 'Bengaluru', state: 'Karnataka' },
        creator: citizenUser._id,
        status: 'active'
      });
    });

    it('should allow the creator to delete their petition before signatures (signaturesCount === 0)', async () => {
      const res = await request(app)
        .delete(`/api/petitions/${petitionWithZeroSignatures._id}`)
        .set('Authorization', `Bearer ${citizenToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.deleted).toBe(true);

      const checkDb = await Petition.findById(petitionWithZeroSignatures._id);
      expect(checkDb).toBeNull();
    });

    it('should reject deletion by a non-creator (403 Forbidden)', async () => {
      const res = await request(app)
        .delete(`/api/petitions/${petitionWithZeroSignatures._id}`)
        .set('Authorization', `Bearer ${otherCitizenToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('not authorized');

      const checkDb = await Petition.findById(petitionWithZeroSignatures._id);
      expect(checkDb).not.toBeNull();
    });

    it('should reject deletion when petition already has signatures (signaturesCount > 0)', async () => {
      const res = await request(app)
        .delete(`/api/petitions/${petitionWithSignatures._id}`)
        .set('Authorization', `Bearer ${citizenToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Cannot delete a petition that has already received signatures');

      const checkDb = await Petition.findById(petitionWithSignatures._id);
      expect(checkDb).not.toBeNull();
    });

    it('should reject unauthenticated delete request (401)', async () => {
      const res = await request(app).delete(`/api/petitions/${petitionWithZeroSignatures._id}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
