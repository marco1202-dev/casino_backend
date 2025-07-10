const express = require('express');
const cors = require('cors');
const app = express();

require('dotenv').config();

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());

const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);

module.exports = app;