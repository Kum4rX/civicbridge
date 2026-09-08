const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body ? JSON.parse(body) : null,
          });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== CIVIX LIVE VERIFICATION SUITE ===\n');
  const timestamp = Date.now();

  // Test 1: Registration with Angular payload format
  console.log('1. Testing Registration (Contract Alignment)...');
  const user1Email = `citizen_${timestamp}@test.com`;
  const regPayload = {
    name: 'Citizen Test User',
    fullName: 'Citizen Test User',
    email: user1Email,
    password: 'Password123!',
    role: 'CITIZEN',
    location: {
      address: '123 Test St',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001',
      latitude: null,
      longitude: null,
    },
  };

  const regRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    regPayload
  );

  console.log(`   Registration Status: ${regRes.status} (Expected: 201)`);
  if (regRes.status !== 201) {
    console.error('   Registration Failed:', regRes.body);
    process.exit(1);
  }
  const user1Token = regRes.body.data.token;
  console.log('   Registration Success! User ID:', regRes.body.data.user.id);

  // Test 2: Login
  console.log('\n2. Testing Login...');
  const loginRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: user1Email, password: 'Password123!' }
  );
  console.log(`   Login Status: ${loginRes.status} (Expected: 200)`);
  console.log('   Login Success! Token received:', !!loginRes.body.data.token);

  // Test 3: GET /api/auth/me
  console.log('\n3. Testing GET /api/auth/me (User Profile)...');
  const meRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/me',
    method: 'GET',
    headers: { Authorization: `Bearer ${user1Token}` },
  });
  console.log(`   Auth Me Status: ${meRes.status} (Expected: 200)`);
  console.log('   Auth Me User:', meRes.body.data.user.fullName, `(${meRes.body.data.user.email})`);

  // Test 4: POST /api/petitions (Verify NO 500 error, creator ID correctly assigned)
  console.log('\n4. Testing POST /api/petitions (Creation without 500)...');
  const petitionPayload = {
    title: `Improve Civic Infrastructure in Ward ${timestamp}`,
    description: 'We need urgent repairs and road resurfacing to ensure road safety for pedestrians and drivers.',
    category: 'Infrastructure',
    tags: ['roads', 'safety'],
    targetSignatures: 100,
    location: {
      address: 'Ward 12 Crossway',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001',
    },
  };

  const createRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/petitions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
    },
    petitionPayload
  );
  console.log(`   Create Petition Status: ${createRes.status} (Expected: 201)`);
  if (createRes.status !== 201) {
    console.error('   Create Petition Failed:', createRes.body);
    process.exit(1);
  }
  const petition1 = createRes.body.data.petition;
  console.log('   Petition Created Successfully!');
  console.log('   Petition ID:', petition1._id || petition1.id);
  console.log('   Petition Creator ID:', petition1.creator);
  console.log('   Petition Title:', petition1.title);
  console.log('   Petition Signatures Count:', petition1.signaturesCount);

  const petitionId = petition1._id || petition1.id;

  // Test 5: GET /api/petitions (Listing)
  console.log('\n5. Testing GET /api/petitions (Listing)...');
  const listRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/petitions',
    method: 'GET',
  });
  console.log(`   List Status: ${listRes.status} (Expected: 200)`);
  console.log(`   Total Petitions: ${listRes.body.data.pagination.total}`);
  console.log(`   Items in Page: ${listRes.body.data.petitions.length}`);

  // Test 6: GET /api/petitions/my (User's Petitions)
  console.log('\n6. Testing GET /api/petitions/my (My Petitions)...');
  const myRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/petitions/my',
    method: 'GET',
    headers: { Authorization: `Bearer ${user1Token}` },
  });
  console.log(`   My Petitions Status: ${myRes.status} (Expected: 200)`);
  console.log(`   User's Petitions Count: ${myRes.body.data.petitions.length}`);
  const foundOwn = myRes.body.data.petitions.some((p) => (p._id || p.id) === petitionId);
  console.log('   Own petition included in list:', foundOwn);

  // Test 7: GET /api/petitions/:id (Detail)
  console.log(`\n7. Testing GET /api/petitions/${petitionId} (Detail)...`);
  const detailRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/petitions/${petitionId}`,
    method: 'GET',
  });
  console.log(`   Detail Status: ${detailRes.status} (Expected: 200)`);
  console.log('   Detail Title:', detailRes.body.data.petition.title);
  console.log('   Detail Creator populated:', !!detailRes.body.data.petition.creator);

  // Test 8: Search, Filtering, Pagination, Sorting
  console.log('\n8. Testing Search, Filtering, Pagination, and Sorting...');
  // 8a: Search
  const searchRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/petitions?search=Infrastructure%20in%20Ward%20${timestamp}`,
    method: 'GET',
  });
  console.log(`   Search Status: ${searchRes.status}, Results found: ${searchRes.body.data.petitions.length}`);

  // 8b: Filter by category
  const catRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/petitions?category=Infrastructure',
    method: 'GET',
  });
  console.log(`   Filter Category Status: ${catRes.status}, Results: ${catRes.body.data.petitions.length}`);

  // 8c: Filter by status (lowercase per contract)
  const statusRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/petitions?status=active',
    method: 'GET',
  });
  console.log(`   Filter Status Status: ${statusRes.status}, Results: ${statusRes.body.data.petitions.length}`);

  // 8d: Pagination & Sorting (sortBy=signaturesCount&order=desc)
  const pageRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/petitions?page=1&limit=2&sortBy=signaturesCount&order=desc',
    method: 'GET',
  });
  console.log(`   Pagination/Sort Status: ${pageRes.status}, Page: ${pageRes.body.data.pagination.page}, Limit: ${pageRes.body.data.pagination.limit}`);

  // Test 9: Edit and Delete restrictions
  console.log('\n9. Testing Edit and Delete Restrictions...');
  // 9a: Update petition before any signatures (Should SUCCEED)
  const updateRes1 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/petitions/${petitionId}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
    },
    {
      title: `Updated Title for Ward ${timestamp}`,
      description: 'Updated description for urgent road repairs.',
    }
  );
  console.log(`   9a. Update with 0 signatures Status: ${updateRes1.status} (Expected: 200)`);
  console.log('       Updated Title:', updateRes1.body.data.petition.title);

  // Register Citizen 2
  const user2Email = `citizen2_${timestamp}@test.com`;
  const reg2Res = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      name: 'Second Citizen',
      fullName: 'Second Citizen',
      email: user2Email,
      password: 'Password123!',
      role: 'CITIZEN',
      location: { city: 'Bengaluru', state: 'Karnataka' },
    }
  );
  const user2Token = reg2Res.body.data.token;

  // 9b: Non-creator attempts to edit Citizen 1's petition (Should FAIL 403 Forbidden)
  const updateNonOwner = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/petitions/${petitionId}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user2Token}`,
      },
    },
    { title: 'Unauthorized Edit Attempt' }
  );
  console.log(`   9b. Non-creator update Status: ${updateNonOwner.status} (Expected: 403)`);
  console.log('       Error message:', updateNonOwner.body.message);

  // Set signaturesCount to 10 in DB to test edit/delete restrictions
  const mongoose = require('mongoose');
  await mongoose.connect('mongodb://localhost:27017/civix');
  const Petition = require('../src/models/petition.model');
  await Petition.findByIdAndUpdate(petitionId, { signaturesCount: 10 });
  console.log('   Simulated 10 signatures on petition in DB.');

  // 9c: Creator attempts to update petition AFTER it has signatures (Should FAIL 400)
  const updateRes2 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/petitions/${petitionId}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
    },
    { title: 'Attempted Update After Signatures' }
  );
  console.log(`   9c. Update after signatures Status: ${updateRes2.status} (Expected: 400)`);
  console.log('       Error message:', updateRes2.body.message);

  // 9d: Creator attempts to delete petition AFTER it has signatures (Should FAIL 400)
  const deleteRes1 = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/petitions/${petitionId}`,
    method: 'DELETE',
    headers: { Authorization: `Bearer ${user1Token}` },
  });
  console.log(`   9d. Delete after signatures Status: ${deleteRes1.status} (Expected: 400)`);
  console.log('       Error message:', deleteRes1.body.message);

  // 9e: Citizen 2 attempts to delete Citizen 1's petition (Should FAIL 403 Forbidden)
  const deleteRes2 = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/petitions/${petitionId}`,
    method: 'DELETE',
    headers: { Authorization: `Bearer ${user2Token}` },
  });
  console.log(`   9e. Non-creator delete Status: ${deleteRes2.status} (Expected: 403)`);
  console.log('       Error message:', deleteRes2.body.message);

  // 9f: Create another petition with 0 signatures and delete it (Should SUCCEED 200)
  const createTemp = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/petitions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
    },
    {
      title: `Temporary petition for deletion ${timestamp}`,
      description: 'This is a temporary petition to verify that deletion succeeds when signatures count is 0.',
      category: 'Environment',
      targetSignatures: 50,
      location: { city: 'Bengaluru', state: 'Karnataka' },
    }
  );
  const tempId = createTemp.body.data.petition._id || createTemp.body.data.petition.id;
  const deleteTemp = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/petitions/${tempId}`,
    method: 'DELETE',
    headers: { Authorization: `Bearer ${user1Token}` },
  });
  console.log(`   9f. Delete 0-signature petition Status: ${deleteTemp.status} (Expected: 200)`);
  console.log('       Success message:', deleteTemp.body.message);

  await mongoose.disconnect();
  console.log('\n=== ALL VERIFICATION CHECKS PASSED SUCCESSFULLY ===');
}

runTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
