const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 3000;

const mongoURI = 'enteryourmongodbatlaslink';
const hospitalRouter = express.Router();
// Middleware
app.use(cors()); // Enable CORS for all origins, can be restricted if needed
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Connect to MongoDB Atlas
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Donor Schema
const donorSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  dob: { type: Date, required: true },
  state: String,
  city: String,
  createdAt: { type: Date, default: Date.now }
});
const Donor = mongoose.model('Donor', donorSchema);

// Donation Schema (Blood + Organ)
const donationSchema = new mongoose.Schema({
  donorEmail: { type: String, required: true },
  type: { type: String, enum: ['Blood', 'Organ'], required: true },
  formData: Object,
  createdAt: { type: Date, default: Date.now }
});
const Donation = mongoose.model('Donation', donationSchema);

const urgentSchema = new mongoose.Schema({
  donationType: String,
  bloodGroup: String,
  details: String,
  hospitalName: String,
  hospitalAddress: String,
  createdAt: { type: Date, default: Date.now }
});
const UrgentRequest = mongoose.model('UrgentRequest', urgentSchema);

// Hospital Schema
const hospitalSchema = new mongoose.Schema({
  hospitalName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  address: { type: String, required: true },
  password: { type: String, required: true },
}, { timestamps: true });

const Hospital = mongoose.model('Hospital', hospitalSchema);
// ---------------- ROUTES ---------------- //
app.post('/api/hospital/register', async (req, res) => {
  try {
    const { hospitalName, email, address, password } = req.body;

    if (!hospitalName || !email || !address || !password) {
      return res.status(400).json({ message: 'Please fill all fields.' });
    }

    const existingHospital = await Hospital.findOne({ email });
    if (existingHospital) {
      return res.status(409).json({ message: 'Hospital already registered with this email.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newHospital = new Hospital({
      hospitalName,
      email,
      address,
      password: hashedPassword,
    });

    await newHospital.save();

    res.status(201).json({ message: 'Hospital registered successfully.' });
  } catch (err) {
    console.error('Hospital Register Error:', err);
    res.status(500).json({ message: 'Server error during hospital registration.' });
  }
});


// Hospital Login
app.post('/api/hospital/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password.' });
    }

    const hospital = await Hospital.findOne({ email });
    if (!hospital) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, hospital.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    res.json({
      message: 'Login successful',
      hospital: {
        hospitalName: hospital.hospitalName,
        email: hospital.email,
        address: hospital.address
      }
    });
  } catch (err) {
    console.error('Hospital Login Error:', err);
    res.status(500).json({ message: 'Server error during hospital login.' });
  }
});


// Submit urgent donation request
app.post('/api/urgent', async (req, res) => {
  try {
    const request = new UrgentRequest(req.body);
    await request.save();
    res.status(201).json({ message: 'Urgent donation request submitted.' });
  } catch (err) {
    console.error('Urgent Submit Error:', err);
    res.status(500).json({ message: 'Server error while submitting request.' });
  }
});

// Get all urgent requests (for index.html)


// Get all donors (for hospital page)
app.get('/api/donation/all', async (req, res) => {
  try {
    const donations = await Donation.find().sort({ createdAt: -1 });
    res.json(donations);
  } catch (err) {
    console.error('Get all donations error:', err);
    res.status(500).json({ message: 'Failed to fetch donors.' });
  }
});

// Register Donor
app.post('/api/donor/register', async (req, res) => {
  try {
    const { email, password, dob, state, city } = req.body;

    // Validate age >= 18
    const age = new Date().getFullYear() - new Date(dob).getFullYear();
    if (age < 18) return res.status(400).json({ message: 'Must be 18 or older to register.' });

    // Check for existing email
    const existing = await Donor.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Email already registered.' });

    // Hash password and save new donor
    const hashedPassword = await bcrypt.hash(password, 10);
    const newDonor = new Donor({ email, password: hashedPassword, dob, state, city });
    await newDonor.save();

    res.status(201).json({ message: 'Donor registered successfully.' });
  } catch (err) {
    console.error('Register Error:', err);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

// Donor Login
app.post('/api/donor/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const donor = await Donor.findOne({ email });
    if (!donor) return res.status(404).json({ message: 'Donor not found.' });

    const isMatch = await bcrypt.compare(password, donor.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid password.' });

    res.status(200).json({ message: 'Login successful', donor });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

// Submit Donation (Blood or Organ)
app.post('/api/donation/submit', async (req, res) => {
  try {
    const { donorEmail, type, formData } = req.body;

    if (!donorEmail || !type || !formData) {
      return res.status(400).json({ message: 'Invalid submission data.' });
    }

    const donation = new Donation({ donorEmail, type, formData });
    await donation.save();

    res.status(201).json({ message: 'Donation form submitted.' });
  } catch (err) {
    console.error('Donation Submit Error:', err);
    res.status(500).json({ message: 'Error submitting donation.' });
  }
});

// Get Donations by Donor Email
app.get('/api/donation/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const donations = await Donation.find({ donorEmail: email });

    res.status(200).json(donations);
  } catch (err) {
    console.error('Fetch Donations Error:', err);
    res.status(500).json({ message: 'Error fetching donations.' });
  }
});

// Withdraw/Delete Donation by ID
app.delete('/api/donation/:id', async (req, res) => {
  try {
    const donationId = req.params.id;

    const deleted = await Donation.findByIdAndDelete(donationId);
    if (!deleted) return res.status(404).json({ message: 'Donation not found.' });

    res.status(200).json({ message: 'Donation withdrawn.' });
  } catch (err) {
    console.error('Withdrawal Error:', err);
    res.status(500).json({ message: 'Error withdrawing donation.' });
  }
});


app.get('/api/urgent', async (req, res) => {
  try {
    const requests = await UrgentRequest.find().sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    console.error('Fetch Urgent Requests Error:', err);
    res.status(500).json({ message: 'Error fetching urgent requests.' });
  }
});

app.get('/api/urgent', async (req, res) => {
  try {
    const requests = await UrgentRequest.find().sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    console.error('Fetch Urgent Requests Error:', err);
    res.status(500).json({ message: 'Error fetching urgent requests.' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
