import { Meteor } from 'meteor/meteor';
import { WebApp } from 'meteor/webapp';
import { Accounts } from 'meteor/accounts-base';
import cors from 'cors';

// ✅ Step 1: Define allowed origins
const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',');


// ✅ Step 2: Apply CORS middleware globally
WebApp.connectHandlers.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // Allow non-browser requests
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('CORS policy: Not allowed'));
    }
  },
  credentials: true,
}));

// ✅ Step 3: Existing startup logic
Meteor.startup(() => {
  WebApp.connectHandlers.use('/api', (req, res, next) => {
    res.writeHead(200);
    res.end('API Endpoint');
  });

  // Additional server logic can go here...
});
