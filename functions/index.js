const functions = require('firebase-functions');
const admin = require('firebase-admin'); // Pour accès à la BDD
// Require express
const app = require('express')();
const firebase = require('firebase');

const firebaseConfig = {
    apiKey: "AIzaSyDud9E3M2xY5UkJeAf_S4wovSGpP0oaZjU",
    authDomain: "socialmediaapp-de7d3.firebaseapp.com",
    databaseURL: "https://socialmediaapp-de7d3.firebaseio.com",
    projectId: "socialmediaapp-de7d3",
    storageBucket: "socialmediaapp-de7d3.appspot.com",
    messagingSenderId: "250490639782",
    appId: "1:250490639782:web:1e682f39eaaed6d69e2b67",
};

const adminConfig = {
    credential: admin.credential.applicationDefault(),
    databaseURL: 'https://database-name.firebaseio.com'
}

firebase.initializeApp(firebaseConfig);

// Il faut initialiser l'application pour pouvoir avoir accès aux fonctionnalités admin
// var serviceAccount = require("./socialmediaapp-de7d3-firebase-adminsdk-afchb-f7b89c0f4b.json");

admin.initializeApp(adminConfig);


// =====================================================================
// ======================  CHEMINS API =================================
// =====================================================================

const db = admin.firestore();

// Récupération des screams créés manuellement
app.get("/screams", (req, res) => {
    db
    .collection("screams")
    .orderBy("createdAt", "desc")
    .get()
    .then((data) => {
        let screams = [];

        // Parcours et ajout de tous les screams
        data.forEach(doc => {
            screams.push(doc.data());
        })

        // Return data
        return res.json(screams);
    })
    .catch((err) => {
        console.error(err);
        res.status(500).json({ error: 'something went wrong' });
    });
});

// Requête POST: créer des posts
app.post("/scream", (req, res) => {
    // Récupération des parametres POST
    const newScream = {
        body: req.body.body,
        userHandle: req.body.userHandle,
        // createdAt: db.Timestamp.fromDate(new Date()),
        createdAt: new Date().toISOString(),
    }

    // Envoi du nouveau post en base de donnée
    db
        .collection('screams')
        // Ajout du nouveau post à la requête
        .add(newScream)
        // Message de retour
        .then((doc) => {
            res.json({
                message: `document ${doc.id} created successfully`
            });
        })
        // En cas d'erreur: code 500 & message d'erreur
        .catch((err) => {
            res.status(500).json({ error: 'something went wrong' });
            console.error(err);
        })
});

// Route d'inscription (signup)
app.post('/signup', (req, res) => {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle
    }

    let token, userId;
    // Userhandle unique pour chaque nouvel utilisateur
    db.doc(`/users/${newUser.handle}`).get()
    .then(doc => {
        // Si le nom d'utilisateur existe
        if(doc.exists){
            return res.status(400).json({ 
                handle: 'This handle already exists!'
            });
        }
        // Sinon, création de l'utilisateur
        else{
            return firebase
            .auth()
            .createUserWithEmailAndPassword(newUser.email ,newUser.password)
            .then((data) => {
                userId = data.user.uid;
                // Récupération du userId
                return data.user.getIdToken();
            })
            .then(idToken => {
                // Sauvegarde du document utilisateur dans la collection /users
                token = idToken;

                const userCredentials = {
                    handle: newUser.handle,
                    email: newUser.email,
                    createdAt: new Date().toISOString(),
                    userId // équivalent à userId: userId
                };

                // Persistance des credentials
                return db.doc(`/users/${newUser.handle}`).set(userCredentials);
            })
            .then(() => {
                // Message de réponse 201 (création d'une nouvelle ressource)
                return res.status(201).json({ token });
            })
            .catch((err) => {
                // Messages d'erreur
                if(err.code === "auth/email-already-in-use"){
                    return res.status(400).json({email: 'Email is already in use'});
                }
                else{
                    return res.status(500).json({error: err.code});
                }
            })
        }
    })

    // // Validate data
    // firebase
    // .auth()
    // .createUserWithEmailAndPassword(newUser.email ,newUser.password)
    // .then((data) => {
    //     // 201 = resource
    //     return res.status(201).json({
    //         message: `user ${data.user.uid} signed up successfuly!`
    //     });
    // })
    // .catch((err) => {
    //     console.error(err)
    //     return res.status(500).json({
    //         error: err.code
    //     });
    // })
});

exports.api = functions.region('europe-west1').https.onRequest(app);