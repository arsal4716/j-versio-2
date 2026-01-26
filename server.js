const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config();

const database = require('./config/database');
const errorHandler = require('./middlewares/errorHandler');
const centerRoutes = require('./routes/centerRoutes');
const formSetupRoutes = require('./routes/formSetupRoutes');
const verificationCode = require('./routes/verificationCodeRoute');
const formSubmit = require('./routes/submitFormRoutes');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/userRoutes');
const ensureSuperAdmin = require("./utils/ensureSuperAdmin");

const app = express();

/* ---------------- middleware ---------------- */

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use("/uploads", express.static("uploads"));
app.use("/sheets", express.static("sheets"));

/* ---------------- health ---------------- */

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Jornaya Bot Backend'
  });
});

/* ---------------- API routes ---------------- */

app.use('/api/auth', authRoutes);
app.use('/api/verification', verificationCode);
app.use('/api/centers', centerRoutes);
app.use('/api/users', userRoutes);
app.use('/api/form-setup', formSetupRoutes);
app.use('/api/submit-form', formSubmit);

/* ---------------- frontend ---------------- */

// serve frontend folder
app.use(express.static(path.join(__dirname, 'frontend', 'dist')));

// root route
app.get('*', (req, res) => {
  res.sendFile(
    path.join(__dirname, 'frontend', 'dist', 'index.html')
  );
});

/* ---------------- 404 (API ONLY) ---------------- */

app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

/* ---------------- error handler ---------------- */

app.use(errorHandler);

/* ---------------- server start ---------------- */

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await database.connect();
    await ensureSuperAdmin();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

process.on('SIGINT', async () => {
  console.log('\nShutting down server...');
  await database.disconnect();
  process.exit(0);
});

startServer();
