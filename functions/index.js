const functions = require('firebase-functions');

// Require express
const app = require('express')();

const FBAuth = require('./util/fbAuth');

const { getAllScreams, postOneScream } = require('./handlers/screams');
const { login, signup, uploadImage } = require('./handlers/users');

// const firebaseConfig = require('./util/config');

// const firebase = require("firebase");
// firebase.initializeApp(firebaseConfig);

// =====================================================================
// ======================  CHEMINS API =================================
// =====================================================================

// Routes screams
app.get("/screams", getAllScreams);
app.post("/scream", FBAuth, postOneScream); // Requête POST: créer un post

// Route de login
app.post("/login", login);
app.post("/signup", signup);
app.post("/user/image", FBAuth, uploadImage);

exports.api = functions.region('europe-west1').https.onRequest(app);