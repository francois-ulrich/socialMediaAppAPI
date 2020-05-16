const functions = require('firebase-functions');

// Require express
const app = require('express')();

const FBAuth = require('./util/fbAuth');

const { 
    getAllScreams, 
    postOneScream,
    deleteScream,
    getScream, 
    commentOnScream ,
    likeScream,
    unlikeScream
} = require('./handlers/screams');

const { 
    login, 
    signup, 
    uploadImage, 
    addUserDetails, 
    getAuthenticatedUser 
} = require('./handlers/users');

// const firebaseConfig = require('./util/config');

// const firebase = require("firebase");
// firebase.initializeApp(firebaseConfig);

// =====================================================================
// ======================  CHEMINS API =================================
// =====================================================================

// Routes screams
app.get("/screams", getAllScreams);
app.get("/scream/:screamId",  getScream);
app.post("/scream", FBAuth, postOneScream);
app.post("/scream/:screamId/comment", FBAuth, commentOnScream);
app.post('/scream/:screamId/like', FBAuth, likeScream);
app.post('/scream/:screamId/unlike', FBAuth, unlikeScream);
app.delete("/scream/:screamId", FBAuth, deleteScream);

// TODO
// delete scream
// like a scream
// unlike a scream
// comment on scream


// Route de login
app.get("/user", FBAuth, getAuthenticatedUser);
app.post("/login", login);
app.post("/signup", signup);
app.post("/user/image", FBAuth, uploadImage);
app.post("/user", FBAuth, addUserDetails);

exports.api = functions.region('europe-west1').https.onRequest(app);