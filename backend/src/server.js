require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

// Connect to MongoDB (optional for basic endpoints)
connectDB()
  .then(() => {
    console.log('MongoDB connected successfully');
  })
  .catch((error) => {
    console.warn('Warning: Failed to connect to MongoDB:', error.message);
    console.warn('Server will start anyway, but database features will not work');
  });

// Start server regardless of DB connection
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`CORS origin: ${process.env.CLIENT_ORIGIN || 'http://localhost:4200'}`);
});