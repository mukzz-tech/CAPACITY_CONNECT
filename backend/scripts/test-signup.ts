import dotenv from 'dotenv';
dotenv.config();

async function testSignup() {
  const email = 'live-officer-' + Date.now() + '@imd.test';
  const res = await fetch('http://localhost:5000/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: 'password123',
      fullName: 'Live Test Officer',
      requestedRole: 'TRAINEE',
      jobDesignation: 'Observatory Officer',
      department: 'IMD Central Training Institute'
    })
  });
  console.log('Signup Status:', res.status);
  const json = await res.json();
  console.log('Signup result:', json);
}

testSignup();
