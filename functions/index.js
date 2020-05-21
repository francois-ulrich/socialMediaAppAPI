const functions = require('firebase-functions');

// Require express
const app = require('express')();

const FBAuth = require('./util/fbAuth');

const {db} = require('./util/admin');

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
    getAuthenticatedUser,
    getUserDetails,
    markNotificationsRead

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
app.get("/user/:handle", getUserDetails);
app.post("/notifications", FBAuth, markNotificationsRead);

exports.api = functions.region('europe-west1').https.onRequest(app);

// Notifications
exports.createNotificationOnLike = functions
.region('europe-west1')
.firestore
.document(`likes/{id}`)
.onCreate((snapshot) => {
    db.doc(`/screams/${snapshot.data().screamId}`).get()
    .then(doc => {
        if(doc.exists){
            return db.doc(`/notifications/${snapshot.id}`).set({
                createdAt: new Date().toISOString(),
                recipient: doc.data().userHandle,
                sender: snapshot.data().userHandle,
                read: false,
                screamId: doc.id,
                type: 'like',
            })
        }
    })
    .then(() => {
        return
    })
    // En cas d'erreur: code 500 & message d'erreur
    .catch((err) => {
        console.error(err);
        return;
    });
});

// Notifications
exports.createNotificationOnComment = functions
.region('europe-west1')
.firestore
.document(`comments/{id}`)
.onCreate((snapshot) => {
    db.doc(`/screams/${snapshot.data().screamId}`).get()
    .then(doc => {
        if(doc.exists){
            return db.doc(`/notifications/${snapshot.id}`).set({
                createdAt: new Date().toISOString(),
                recipient: doc.data().userHandle,
                sender: snapshot.data().userHandle,
                read: false,
                screamId: doc.id,
                type: 'comment',
            })
        }
    })
    .then(() => {
        return
    })
    // En cas d'erreur: code 500 & message d'erreur
    .catch((err) => {
        console.error(err);
        return;
    });
});

exports.deleteNotificationOnUnlike = functions
.region('europe-west1')
.firestore
.document(`likes/{id}`)
.onDelete((snapshot) => {
    db.doc(`/notifications/${snapshot.id}`)
    .delete()
    .then(() => {
        return;
    })
    .catch((err) => {
        console.error(err);
        return;
    });
});