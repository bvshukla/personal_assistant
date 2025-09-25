/*
  Seed 10 users into MongoDB using the existing Mongoose model.
  Usage: `npm run seed`
*/

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

async function main () {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set in .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB for seeding');

    // Build 10 users with unique emails
    const users = Array.from({ length: 10 }, (_, i) => {
      const n = i + 1;
      return {
        name: `Seed User ${n}`,
        email: `seeduser${n}@example.com`,
        password: 'password123'
      };
    });

    const emails = users.map(u => u.email);

    // Remove any existing users with these emails to avoid duplicate key errors
    const deleteResult = await User.deleteMany({ email: { $in: emails } });
    if (deleteResult.deletedCount) {
      console.log(`Removed ${deleteResult.deletedCount} existing seed users`);
    }

    const inserted = await User.insertMany(users, { ordered: false });
    console.log(`Inserted ${inserted.length} users`);
  } catch (err) {
    console.error('Error while seeding users:', err);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

main();
