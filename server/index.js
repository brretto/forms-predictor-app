// 1. Load environment variables IMMEDIATELY
require('dotenv').config();

// 2. Import all required packages
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const router = require('./routes/router');

// 3. Initialize the Express app
const app = express();

// 4. Set up middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// 5. Set up the API routes
app.use('/api', router);

// 6. Define the MongoDB connection URI from the .env file
const mongoURI = process.env.MONGO_URI;

// 7. Connect to MongoDB with proper error handling
// We use an async function to make the connection logic cleaner
const connectDB = async () => {
  try {
    // Check if the URI was loaded correctly
    if (!mongoURI) {
      console.error('ERROR: MONGO_URI is not defined in your .env file.');
      process.exit(1); // Exit the application if the database URI is missing
    }
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Connected to MongoDB successfully!');
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB', err);
    process.exit(1); // Exit the application on a connection error
  }
};

// 8. Call the function to connect to the database
connectDB();


// 9. Define the port and start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🔥🚀 App is listening on port ${PORT} 🔥🚀`);
});