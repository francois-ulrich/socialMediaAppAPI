const functions = require('firebase-functions');

// Require express
const app = require('express')();

const FBAuth = require('./util/fbAuth');

const cors = require('cors')({ origin: true });
app.use(cors());

const { db } = require('./util/admin');

const {
    getAllScreams,
    postOneScream,
    deleteScream,
    getScream,
    commentOnScream,
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
app.get("/scream/:screamId", getScream);
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
        return db.doc(`/screams/${snapshot.data().screamId}`).get()
            .then(doc => {
                if (doc.exists && snapshot.data().userHandle != doc.data().userHandle) {
                    return db.doc(`/notifications/${snapshot.id}`).set({
                        createdAt: new Date().toISOString(),
                        recipient: doc.data().userHandle,
                        sender: snapshot.data().userHandle,
                        read: false,
                        screamId: doc.id,
                        type: 'like',
                    })
                } else return true;
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
        return db.doc(`/screams/${snapshot.data().screamId}`).get()
            .then(doc => {
                if (doc.exists) {
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
        return db.doc(`/notifications/${snapshot.id}`)
            .delete()
            .catch((err) => {
                console.error(err);
                return;
            });
    });

exports.onUserImageChange = functions
    .region('europe-west1')
    .firestore
    .document(`/users/{userId}`)
    .onUpdate((change) => {
        console.log(change.before.data());
        console.log(change.after.data());

        if (change.before.data().imageUrl !== change.after.data().imageUrl) {
            // Batch: permet d'update plusieurs documents à la fois
            const batch = db.batch();

            return db
                .collection('screams')
                .where('userHandle', '==', change.before.data().handle)
                .get()
                .then((data) => {
                    data.forEach((doc) => {
                        const scream = db.doc(`/screams/${doc.id}`);
                        batch.update(scream, { userImage: change.after.data().imageUrl });
                    })

                    return batch.commit()
                })
                .catch((err) => {
                    console.error(err);
                });
        } else return true;
    });

// Suppression des likes / commentaires liés à un scream
exports.onScreamDelete = functions
    .region('europe-west1')
    .firestore
    .document(`/screams/{screamId}`)
    .onDelete((snapshot, context) => {
        const screamId = context.params.screamId;

        const batch = db.batch();

        return db
            .collection('comments')
            .where('screamId', '==', screamId)
            .get()
            .then((data) => {
                data.forEach((doc) => {
                    const comment = db.doc(`/comments/${doc.id}`);
                    batch.delete(comment);
                })

                return db
                    .collection('likes')
                    .where('screamId', '==', screamId)
                    .get()
            })
            .then((data) => {
                data.forEach((doc) => {
                    const like = db.doc(`/likes/${doc.id}`);
                    batch.delete(like);
                })

                return db
                    .collection('notifications')
                    .where('screamId', '==', screamId)
                    .get()
            })
            .then((data) => {
                data.forEach((doc) => {
                    const notification = db.doc(`/notifications/${doc.id}`);
                    batch.delete(notification);
                })

                return batch.commit();
            })
            .catch((err) => {
                console.error(err);
            });
    });