import dotenv from 'dotenv';
dotenv.config();

async function testLogin() {
  const res = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@imd.gov.in',
      password: 'password123',
    }),
  });

  const status = res.status;
  const data = await res.json();
  console.log('Login Response Status:', status);
  console.log('Login Response Data:', data);
}

testLogin();
