const donor = JSON.parse(localStorage.getItem('donorData') || '{}');
const API = 'http://localhost:3000/api/donation';

document.addEventListener("DOMContentLoaded", () => {
  // 🧑‍🤝‍🧑 Show donor info (donor.html only)
  if (document.getElementById('donorName')) {
    document.getElementById('donorName').innerText = donor.name || 'Donor';
    document.getElementById('donorEmail').innerText = donor.email || 'N/A';
    document.getElementById('donorCity').innerText = donor.city || 'N/A';
    document.getElementById('donorState').innerText = donor.state || 'N/A';
    loadSubmittedForms();
  }

  // 💉 Blood donation form (donor.html)
  const bloodForm = document.getElementById('bloodForm');
  if (bloodForm) {
    bloodForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const formData = Object.fromEntries(new FormData(this));
      const payload = {
        donorEmail: donor.email,
        type: 'Blood',
        formData
      };
      await submitDonation(payload);
      this.reset();
    });
  }

  // 🫁 Organ donation form (donor.html)
  const organForm = document.getElementById('organForm');
  if (organForm) {
    organForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const formData = Object.fromEntries(new FormData(this));
      formData.organs = Array.from(this.querySelectorAll('input[name="organs"]:checked')).map(cb => cb.value);
      const payload = {
        donorEmail: donor.email,
        type: 'Organ',
        formData
      };
      await submitDonation(payload);
      this.reset();
    });
  }

  // 🔢 Counter animation (any page)
  document.querySelectorAll(".counter").forEach(counter => {
    counter.innerText = "0";
    const updateCounter = () => {
      const target = +counter.getAttribute("data-target");
      const count = +counter.innerText;
      const increment = target / 100;
      if (count < target) {
        counter.innerText = `${Math.ceil(count + increment)}`;
        setTimeout(updateCounter, 20);
      } else {
        counter.innerText = target;
      }
    };
    updateCounter();
  });

  // 🔐 Register (register page only)
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = {
        email: document.getElementById('regEmail').value,
        password: document.getElementById('regPassword').value,
        dob: document.getElementById('dob').value,
        state: document.getElementById('state').value,
        city: document.getElementById('city').value
      };

      const res = await fetch('/api/donor/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await res.json();
      alert(result.message);
    });
  }

  // 🔓 Login (login page only)
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;

      try {
        const res = await fetch('http://localhost:3000/api/donor/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        if (res.ok) {
          localStorage.setItem('donorData', JSON.stringify({
            email: data.donor.email,
            name: data.donor.email.split('@')[0],
            city: data.donor.city,
            state: data.donor.state
          }));
          window.location.href = 'donor.html';
        } else {
          alert(data.message);
        }
      } catch (err) {
        alert('Login failed. Please try again.');
      }
    });
  }
});

// 📤 Submit donation
async function submitDonation(payload) {
  try {
    const res = await fetch(`${API}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (res.ok) {
      alert(result.message);
      loadSubmittedForms();
    } else {
      alert(result.message);
    }
  } catch (err) {
    alert('Submission error.');
  }
}

// 📄 Load donations
async function loadSubmittedForms() {
  const container = document.getElementById('submittedForms');
  if (!container || !donor.email) return;
  container.innerHTML = 'Loading...';
  try {
    const res = await fetch(`${API}/${donor.email}`);
    const data = await res.json();
    container.innerHTML = '';
    if (data.length === 0) {
      container.innerHTML = '<p>No donations yet.</p>';
      return;
    }
    data.forEach(entry => {
      const div = document.createElement('div');
      div.className = 'alert alert-light border mb-2';
      const details = entry.formData;
      div.innerHTML = `
        <strong>${entry.type} Donation</strong><br/>
        Name: ${details.name}<br/>
        Phone: ${details.phone}<br/>
        Address: ${details.address}<br/>
        ${entry.type === 'Blood' ? 'Blood Group: ' + details.bloodGroup : 'Organs: ' + (details.organs || []).join(', ')}<br/>
        <button class="btn btn-sm btn-outline-danger mt-2" onclick="withdrawDonation('${entry._id}')">Withdraw</button>
      `;
      container.appendChild(div);
    });
  } catch (err) {
    container.innerHTML = 'Error loading donations.';
  }
}

// ❌ Withdraw donation
async function withdrawDonation(id) {
  if (!confirm('Are you sure you want to withdraw this donation?')) return;
  try {
    const res = await fetch(`${API}/${id}`, { method: 'DELETE' });
    const result = await res.json();
    if (res.ok) {
      alert(result.message);
      loadSubmittedForms();
    } else {
      alert(result.message);
    }
  } catch (err) {
    alert('Withdrawal error.');
  }
}
// script.js

// Helper function for POST request
async function postData(url = '', data = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}

// Hospital Login Form
document.getElementById('hospitalLoginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = e.target.loginEmail.value.trim();
  const password = e.target.loginPassword.value;

  if (!email || !password) {
    alert('Please fill all fields.');
    return;
  }

  try {
    const res = await postData('/api/hospital/login', { email, password });

    if (res.message === 'Login successful') {
      alert('Login successful! Welcome ' + (res.hospital.hospitalName || 'Hospital'));

      // Store hospital info in localStorage
      localStorage.setItem('hospitalData', JSON.stringify(res.hospital));

      // Redirect to hospital.html
      window.location.href = "hospital.html";
    } else {
      alert(res.message || 'Login failed');
    }
  } catch (err) {
    alert('Server error during login.');
    console.error(err);
  }
});

// Hospital Register Form
document.getElementById('hospitalRegisterForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const hospitalName = e.target.hospitalName.value.trim();
  const email = e.target.regEmail.value.trim();
  const address = e.target.address.value.trim();
  const password = e.target.regPassword.value;

  if (!hospitalName || !email || !address || !password) {
    alert('Please fill all fields.');
    return;
  }
  if (password.length < 6) {
    alert('Password must be at least 6 characters.');
    return;
  }

  try {
    const res = await postData('/api/hospital/register', { hospitalName, email, address, password });
    if (res.message === 'Hospital registered successfully.') {
      alert('Registration successful! You can now login.');
      // Switch to login tab after registration
      const loginTab = new bootstrap.Tab(document.querySelector('#hospital-login-tab'));
      loginTab.show();
      e.target.reset();
    } else {
      alert(res.message || 'Registration failed');
    }
  } catch (err) {
    alert('Server error during registration.');
    console.error(err);
  }
});


