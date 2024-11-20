const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const sequelize = require('./database');
const User = require('./models/user');
require('dotenv').config();

// Firebase Admin Initialization
const serviceAccount = require('./firebaseServiceAccount.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const app = express();
app.use(cors());
app.use(express.json());

// Sync Sequelize models
sequelize.sync({ alter: true }).then(() => {
    console.log('Database synced');
});

// Middleware: Verify Firebase Token
const verifyToken = async (req, res, next) => {
    console.log('Verifying Firebase Token',req);
    const idToken = req.headers.authorization?.split('Bearer ')[1];
    if (!idToken) return res.status(403).send({ error: 'No token provided' });

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
      //  console.log(decodedToken);
        req.user = decodedToken;
        next();
    } catch (err) {
        res.status(403).send({ error: 'Unauthorized' });
    }
};

// Save or Authenticate User
app.post('/login', verifyToken, async (req, res) => {
    const { uid, name, email } = req.user;

    try {
        const [user, created] = await User.findOrCreate({
            where: { id: uid },
            defaults: { name, email },
        });

        res.status(200).send({
            message: created ? 'User created' : 'User logged in',
            user,
        });
    } catch (error) {
        res.status(500).send({ error: 'Error saving user to database' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
