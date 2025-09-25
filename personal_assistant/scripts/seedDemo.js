/*
  Seed realistic demo data: Users, Teams, Appointments, FollowUpItems
  Usage:
    node scripts/seedDemo.js
  Requires MONGODB_URI in personal_assistant/.env
*/

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const User = require('../models/User');
const Team = require('../models/Team');
const Appointment = require('../models/Appointment');
const FollowUpItem = require('../models/FollowUpItem');

function randomChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function addMinutes(date, mins) { return new Date(date.getTime() + mins * 60000); }
function setTime(date, hours, minutes) {
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d;
}
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set in .env');
    process.exit(1);
  }

  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB for seeding');

  try {
    // 1) Seed Users
    const demoUsers = [
      { name: 'Alice Johnson', email: 'alice.johnson@example.com', password: 'Passw0rd!' },
      { name: 'Bob Martinez', email: 'bob.martinez@example.com', password: 'Passw0rd!' },
      { name: 'Carol Singh', email: 'carol.singh@example.com', password: 'Passw0rd!' },
      { name: 'Danielle Kim', email: 'danielle.kim@example.com', password: 'Passw0rd!' },
      { name: 'Ethan Brown', email: 'ethan.brown@example.com', password: 'Passw0rd!' }
    ];

    const emails = demoUsers.map(u => u.email);
    await User.deleteMany({ email: { $in: emails } });
    const users = await User.insertMany(demoUsers);
    console.log(`Inserted ${users.length} users`);

    const byEmail = Object.fromEntries(users.map(u => [u.email, u]));

    // 2) Seed Teams
    // Two teams: Platform (owner: Alice), Mobile (owner: Bob)
    await Team.deleteMany({ owner: { $in: users.map(u => u._id) } });

    const platformTeam = new Team({
      name: 'Platform',
      description: 'Core platform engineering team',
      owner: byEmail['alice.johnson@example.com']._id,
      members: [
        byEmail['alice.johnson@example.com']._id,
        byEmail['carol.singh@example.com']._id,
        byEmail['danielle.kim@example.com']._id,
      ]
    });

    const mobileTeam = new Team({
      name: 'Mobile',
      description: 'Mobile apps and SDKs',
      owner: byEmail['bob.martinez@example.com']._id,
      members: [
        byEmail['bob.martinez@example.com']._id,
        byEmail['ethan.brown@example.com']._id,
        byEmail['carol.singh@example.com']._id,
      ]
    });

    const teams = await Team.insertMany([platformTeam, mobileTeam]);
    console.log(`Inserted ${teams.length} teams`);

    // 3) Seed Appointments
    // Clean appointments for these users
    await Appointment.deleteMany({ user: { $in: users.map(u => u._id) } });

    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const titles = [
      'Sprint Planning', '1:1 Meeting', 'Doctor Visit', 'Client Demo', 'Design Review',
      'Project Kickoff', 'Quarterly Sync', 'Tech Talk', 'Interview', 'Budget Review'
    ];

    const locations = ['Zoom', 'HQ - Room A', 'HQ - Room B', 'Clinic', 'Client Office'];

    const allAppointments = [];
    for (const u of users) {
      // 3 appointments per user over next few days
      for (let i = 0; i < 3; i++) {
        const dayOffset = randomInt(0, 7); // within the next week
        const date = new Date(tomorrow.getTime() + dayOffset * 24 * 60 * 60 * 1000);
        // Pick a start time within business hours 9:00-16:00
        const startHour = randomInt(9, 16);
        const startMin = [0, 15, 30, 45][randomInt(0, 3)];
        const startAt = setTime(date, startHour, startMin);
        // Duration 30 to 90 minutes
        const duration = [30, 45, 60, 75, 90][randomInt(0, 4)];
        const endAt = addMinutes(startAt, duration);

        const appt = new Appointment({
          user: u._id,
          title: randomChoice(titles),
          location: randomChoice(locations),
          startAt,
          endAt,
          notes: 'Auto-generated demo appointment.'
        });
        allAppointments.push(appt);
      }
    }
    const insertedAppts = await Appointment.insertMany(allAppointments);
    console.log(`Inserted ${insertedAppts.length} appointments`);

    // 4) Seed FollowUpItems
    // Clean follow-ups linked to these appointments
    await FollowUpItem.deleteMany({ appointment: { $in: insertedAppts.map(a => a._id) } });

    const fupTitles = [
      'Send meeting notes', 'Share slide deck', 'Book next sync', 'Email summary',
      'Create JIRA tickets', 'Prepare demo', 'Follow up with client', 'Draft proposal'
    ];

    const allFollowUps = [];
    for (const appt of insertedAppts) {
      const count = randomInt(1, 3);
      for (let i = 0; i < count; i++) {
        const title = randomChoice(fupTitles);
        // Due date 0-3 days after appointment end
        const dueAt = addMinutes(appt.endAt, (randomInt(0, 3) * 24 + randomInt(0, 8)) * 60);
        // Optional assignee: choose from any user, bias towards appointment owner
        const maybeAssignees = [appt.user, ...users.map(u => u._id)];
        const assignee = randomChoice(maybeAssignees);

        allFollowUps.push(new FollowUpItem({
          appointment: appt._id,
          title, // unique per appointment enforced by index; collisions are unlikely but possible
          description: 'Auto-generated follow-up task for demo data.',
          assignee,
          dueAt,
          completed: Math.random() < 0.3 // 30% done
        }));
      }
    }

    // Insert follow-ups but handle potential duplicate title collisions gracefully
    let insertedFups = [];
    try {
      insertedFups = await FollowUpItem.insertMany(allFollowUps, { ordered: false });
    } catch (err) {
      // If some duplicates error because of the (appointment,title) unique index, continue
      console.warn('Some follow-ups may have been skipped due to duplicate titles for an appointment.');
      // Retrieve what was inserted
      insertedFups = await FollowUpItem.find({ appointment: { $in: insertedAppts.map(a => a._id) } });
    }
    console.log(`Inserted ${insertedFups.length} follow-up items`);

    console.log('Seeding complete.');
  } catch (err) {
    console.error('Error while seeding demo data:', err);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

main();
