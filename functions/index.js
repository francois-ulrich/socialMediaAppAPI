const functions = require('firebase-functions');
const admin = require('firebase-admin'); // Pour accès à la BDD


// Il faut initialiser l'application pour pouvoir avoir accès aux fonctionnalités admin
// var serviceAccount = require("./socialmediaapp-de7d3-firebase-adminsdk-afchb-f7b89c0f4b.json");

admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: 'https://database-name.firebaseio.com'
});

// Require express
const express = require('express');
const app = express();

// Récupération des screams créés manuellement
app.get("/screams", (req, res) => {
    admin.firestore()
    .collection("screams")
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
        createdAt: admin.firestore.Timestamp.fromDate(new Date()),
    }

    // Envoi du nouveau post en base de donnée
    admin
        .firestore()
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

exports.api = functions.https.onRequest(app);