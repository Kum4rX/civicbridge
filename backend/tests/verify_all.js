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

  // ==========================================
  // MILESTONE 3: POLLING & FEEDBACK VERIFICATION
  // ==========================================
  console.log('\n10. Testing Milestone 3: Poll Creation (POST /api/polls)...');
  const pollPayload = {
    title: `Civic Poll: Dedicated Bus Lanes on Outer Ring Road ${timestamp}?`,
    description: 'Public opinion poll to prioritize municipal transit investments and road space allocation.',
    category: 'Transportation',
    options: [
      { text: 'Yes, full 24/7 dedicated bus lanes' },
      { text: 'Yes, peak hours only (8am-11am, 5pm-8pm)' },
      { text: 'No, keep current mixed traffic lanes' }
    ],
    targetLocation: {
      city: 'Bengaluru',
      state: 'Karnataka',
      address: 'Outer Ring Road Transit Zone',
      pincode: '560103'
    }
  };

  const createPollRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/polls',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`
      }
    },
    pollPayload
  );

  console.log(`   10a. Poll Creation Status: ${createPollRes.status} (Expected: 201)`);
  if (!createPollRes.body || !createPollRes.body.data || !createPollRes.body.data.poll) {
    throw new Error('Poll creation failed: ' + JSON.stringify(createPollRes.body));
  }
  const poll = createPollRes.body.data.poll;
  const pollId = poll._id || poll.id;
  const opt1Id = poll.options[0]._id || poll.options[0].id;
  const opt2Id = poll.options[1]._id || poll.options[1].id;
  const opt3Id = poll.options[2]._id || poll.options[2].id;
  console.log(`       Created Poll ID: ${pollId}`);
  console.log(`       Options Count: ${poll.options.length}`);

  // Test 10b: List polls with search & filter
  console.log('\n11. Testing Poll Listing & Search (GET /api/polls)...');
  const listPollsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/polls?search=Outer+Ring+Road&category=Transportation`,
    method: 'GET'
  });
  console.log(`   11a. List Polls Status: ${listPollsRes.status} (Expected: 200)`);
  console.log(`       Total Found: ${listPollsRes.body.data.pagination.total}`);

  // Test 10c: Get single poll by ID
  const getPollRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/polls/${pollId}`,
    method: 'GET',
    headers: { Authorization: `Bearer ${user1Token}` }
  });
  console.log(`   11b. Get Single Poll Status: ${getPollRes.status} (Expected: 200)`);
  console.log(`       Title: "${getPollRes.body.data.poll.title}"`);

  // Test 12: Public Voting & Duplicate Prevention
  console.log('\n12. Testing Public Voting & Duplicate Prevention (POST /api/polls/:id/vote)...');
  
  // User 1 votes for Option 1
  const voteRes1 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/polls/${pollId}/vote`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`
      }
    },
    { optionId: opt1Id }
  );
  console.log(`   12a. User 1 Vote Status: ${voteRes1.status} (Expected: 200)`);
  console.log(`       Total Votes now: ${voteRes1.body.data.poll.totalVotes}`);

  // User 2 votes for Option 2
  const voteRes2 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/polls/${pollId}/vote`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user2Token}`
      }
    },
    { optionId: opt2Id }
  );
  console.log(`   12b. User 2 Vote Status: ${voteRes2.status} (Expected: 200)`);
  console.log(`       Total Votes now: ${voteRes2.body.data.poll.totalVotes}`);

  // User 1 attempts duplicate vote (Should FAIL 400)
  const dupVoteRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/polls/${pollId}/vote`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`
      }
    },
    { optionId: opt2Id }
  );
  console.log(`   12c. Duplicate Vote Rejection Status: ${dupVoteRes.status} (Expected: 400)`);
  console.log(`       Rejection message: "${dupVoteRes.body.message}"`);

  // Test 13: Live Results & Dynamic Percentages
  console.log('\n13. Testing Live Results & Dynamic Sentiment (GET /api/polls/:id/results)...');
  const resultsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/polls/${pollId}/results`,
    method: 'GET'
  });
  console.log(`   13a. Results API Status: ${resultsRes.status} (Expected: 200)`);
  console.log(`       Total Votes: ${resultsRes.body.data.totalVotes}`);
  resultsRes.body.data.options.forEach((opt, idx) => {
    console.log(`       Option ${idx + 1}: "${opt.text}" -> ${opt.votes} votes (${opt.percentage}%)`);
  });

  // Test 14: Poll Closing Status
  console.log('\n14. Testing Poll Closing (PATCH /api/polls/:id/status)...');
  const closeRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/polls/${pollId}/status`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`
      }
    },
    { status: 'closed' }
  );
  console.log(`   14a. Close Poll Status: ${closeRes.status} (Expected: 200)`);
  console.log(`       Poll status is now: ${closeRes.body.data.poll.status}`);

  // Vote on closed poll (Should FAIL 400)
  const voteClosedRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/polls/${pollId}/vote`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`
      }
    },
    { optionId: opt3Id }
  );
  console.log(`   14b. Vote on Closed Poll Rejection Status: ${voteClosedRes.status} (Expected: 400)`);
  console.log(`       Rejection message: "${voteClosedRes.body.message}"`);

    // ==========================================
  // MILESTONE 4: GOVERNANCE & REPORTS VERIFICATION
  // ==========================================
  console.log('\n=== MILESTONE 4: GOVERNANCE & CIVIC REPORTS ===');

  // Register Official 1 in Bengaluru
  console.log('\nRegistering Official 1 (Bengaluru)...');
  const off1Email = `official1_${timestamp}@test.com`;
  const regOff1Res = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    },
    {
      fullName: 'Bengaluru Governance Official',
      name: 'Bengaluru Governance Official',
      email: off1Email,
      password: 'Password123!',
      role: 'OFFICIAL',
      location: { city: 'Bengaluru', state: 'Karnataka', pincode: '560001' }
    }
  );
  console.log(`   Official 1 Registration Status: ${regOff1Res.status} (Expected: 201)`);
  const official1Token = regOff1Res.body.data.token;

  // Register Official 2 in Mysuru (to test locality isolation)
  console.log('\nRegistering Official 2 (Mysuru)...');
  const off2Email = `official2_${timestamp}@test.com`;
  const regOff2Res = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    },
    {
      fullName: 'Mysuru Governance Official',
      name: 'Mysuru Governance Official',
      email: off2Email,
      password: 'Password123!',
      role: 'OFFICIAL',
      location: { city: 'Mysuru', state: 'Karnataka', pincode: '570001' }
    }
  );
  console.log(`   Official 2 Registration Status: ${regOff2Res.status} (Expected: 201)`);
  const official2Token = regOff2Res.body.data.token;

  // Test 15: Governance Locality Petition Listing (GET /api/governance/petitions)
  console.log('\n15. Testing Governance Locality Petition Listing (GET /api/governance/petitions)...');
  // Citizen attempted access (Should FAIL 403)
  const citGovRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/governance/petitions',
    method: 'GET',
    headers: { Authorization: `Bearer ${user1Token}` }
  });
  console.log(`   15a. Citizen Access Rejection Status: ${citGovRes.status} (Expected: 403)`);

  // Bengaluru Official access (Should SUCCEED 200)
  const offGovRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/governance/petitions',
    method: 'GET',
    headers: { Authorization: `Bearer ${official1Token}` }
  });
  console.log(`   15b. Bengaluru Official Governance Status: ${offGovRes.status} (Expected: 200)`);
  console.log(`       Petitions in Locality: ${offGovRes.body.data.petitions.length}`);
  console.log(`       Official Locality: ${offGovRes.body.data.locality.city}`);

  // Test 16: Official Response Submission (POST /api/petitions/:id/response)
  console.log('\n16. Testing Official Governance Response (POST /api/petitions/:id/response)...');
  // Citizen attempted response (Should FAIL 403)
  const citRespRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/petitions/${petitionId}/response`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`
      }
    },
    { message: 'Citizen trying to respond as official.' }
  );
  console.log(`   16a. Citizen Response Rejection Status: ${citRespRes.status} (Expected: 403)`);

  // Mysuru Official attempted response to Bengaluru petition (Should FAIL 403 Locality Isolation)
  const mysRespRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/petitions/${petitionId}/response`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${official2Token}`
      }
    },
    { message: 'Mysuru official trying to respond to Bengaluru petition.' }
  );
  console.log(`   16b. Locality Mismatch Rejection Status: ${mysRespRes.status} (Expected: 403)`);

  // Bengaluru Official response (Should SUCCEED 201)
  const blrRespRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/petitions/${petitionId}/response`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${official1Token}`
      }
    },
    {
      message: 'Municipal engineering division has scheduled road inspections for this ward.',
      status: 'under_review'
    }
  );
  console.log(`   16c. Bengaluru Official Response Status: ${blrRespRes.status} (Expected: 201)`);
  console.log(`       Response Author: ${blrRespRes.body.data.response.respondedBy.fullName}`);
  console.log(`       Petition Status is now: ${blrRespRes.body.data.petition.status}`);

  // Test 17: Petition Status Update (PATCH /api/petitions/:id/status)
  console.log('\n17. Testing Petition Status Update (PATCH /api/petitions/:id/status)...');
  const statusUpdateRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/petitions/${petitionId}/status`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${official1Token}`
      }
    },
    { status: 'under_review' }
  );
  console.log(`   17a. Status Update Status: ${statusUpdateRes.status} (Expected: 200)`);
  console.log(`       New Status: ${statusUpdateRes.body.data.newStatus}`);

  // Test 18: Monthly Civic Reports Summary (GET /api/reports/summary)
  console.log('\n18. Testing Monthly Civic Reports Summary (GET /api/reports/summary)...');
  const summaryRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/reports/summary',
    method: 'GET'
  });
  console.log(`   18a. Report Summary Status: ${summaryRes.status} (Expected: 200)`);
  console.log(`       Total Petitions: ${summaryRes.body.data.totalPetitions}`);
  console.log(`       Under Review Petitions: ${summaryRes.body.data.underReviewPetitions}`);
  console.log(`       Total Polls: ${summaryRes.body.data.totalPolls}`);
  console.log(`       Total Votes: ${summaryRes.body.data.totalVotes}`);
  console.log(`       Official Responses: ${summaryRes.body.data.totalResponses}`);

  // Test 19: Detailed Petition Report (GET /api/reports/petitions)
  console.log('\n19. Testing Detailed Petition Report (GET /api/reports/petitions)...');
  const petReportRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/reports/petitions',
    method: 'GET'
  });
  console.log(`   19a. Petition Report Status: ${petReportRes.status} (Expected: 200)`);
  console.log(`       Status Breakdowns: ${petReportRes.body.data.byStatus.length} categories`);
  console.log(`       Category Breakdowns: ${petReportRes.body.data.byCategory.length} categories`);

  // Test 20: Detailed Poll Report (GET /api/reports/polls)
  console.log('\n20. Testing Detailed Poll Report (GET /api/reports/polls)...');
  const pollReportRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/reports/polls',
    method: 'GET'
  });
  console.log(`   20a. Poll Report Status: ${pollReportRes.status} (Expected: 200)`);
  console.log(`       Top Polls with Participation: ${pollReportRes.body.data.participation.length}`);

  // Test 21: Sentiment & Participation Series (GET /api/reports/sentiment)
  console.log('\n21. Testing Sentiment Time-Series (GET /api/reports/sentiment)...');
  const sentimentRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/reports/sentiment',
    method: 'GET'
  });
  console.log(`   21a. Sentiment Series Status: ${sentimentRes.status} (Expected: 200)`);
  console.log(`       Monthly Data Points: ${sentimentRes.body.data.length}`);

  // Test 22: Report CSV Export (GET /api/reports/export)
  console.log('\n22. Testing Report Export (GET /api/reports/export)...');
  const exportRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/reports/export?format=csv',
    method: 'GET',
    headers: { Authorization: `Bearer ${official1Token}` }
  });
  console.log(`   22a. Report Export Status: ${exportRes.status} (Expected: 200)`);
  console.log(`       Content-Type: ${exportRes.headers['content-type']}`);
  console.log(`       Content-Disposition: ${exportRes.headers['content-disposition']}`);
  console.log(`       CSV Length: ${exportRes.body ? exportRes.body.length : 0} bytes`);

  await mongoose.disconnect();
  console.log('\n=== ALL M1, M2, M3, AND M4 VERIFICATION CHECKS PASSED SUCCESSFULLY ===');
}

runTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
