// server/syncUsers.js
import { Meteor } from 'meteor/meteor';
import { Pool } from 'pg';

// Ensure DATABASE_URL is provided.
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Use SSL in production environments.
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const syncUserToPostgres = async (user) => {
  const userId = user._id;
  const name =
    user.profile && user.profile.name
      ? user.profile.name
      : user.emails && user.emails[0] && user.emails[0].address;
  const profileImage = user.profile && user.profile.profile_image ? user.profile.profile_image : null;

  try {
    await pool.query(
      `INSERT INTO users (id, name, profile_image, current_plan, subscription_expiry)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '7 days')
       ON CONFLICT (id)
       DO UPDATE SET 
         name = EXCLUDED.name, 
         profile_image = EXCLUDED.profile_image`,
      [userId, name, profileImage, 'free']
    );
    
    
  } catch (error) {
    console.error('Error syncing user to PostgreSQL:', error);
  }
};

Meteor.users.find().observeChanges({
  added(id, fields) {
    const user = { _id: id, ...fields };
    syncUserToPostgres(user);
  },
  changed(id, fields) {
    const user = Meteor.users.findOne(id);
    syncUserToPostgres(user);
  },
});
