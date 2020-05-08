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

// Création d'un middelware FBAuth (Firabase Authentication)
const FBAuth = (req, res, next) => {
    const bearerString = 'Bearer ';
    let idToken
    // Vérification de si on a un header avec le bearer
    if(req.headers.authorization 
    && req.headers.authorization.startsWith(bearerString)){
        // Récupération du token
        idToken = req.headers.authorization.split(bearerString)[1];
    }
    // Sinon, retour d'une 403 (unauthorized)
    else{
        console.error('No token found');
        // Retour
        return res.status(403).json({
            error: 'Unauthorized'
        })
    }

    admin
    .auth()
    .verifyIdToken(idToken)
    // Récupération du user dans la BDD
    .then(decodedToken => {
        req.user = decodedToken;

        return db
        .collection('users')
        .where('userId', '==', req.user.uid)
        .limit(1)
        .get();
    })
    // Après récupération des données utilisateur
    .then(data => {
        req.user.handle = data.docs[0].data().handle
        // La requête dans laquelle est passée le middleware peut continuer 
        // ex: app.post("/scream", FBAuth...
        return next();
    })
    .catch(err => {
        console.error('Error while verifyng token');
        return res.status(403).json({err});

    })
}

// Requête POST: créer des posts
app.post("/scream", FBAuth, (req, res) => {
    console.log(req.body);


    // Si le body du scream envoyé est vide, retourner une erreur 400 (bad request)
    if(req.body.body.trim() === ''){
        return res.status(400).json({
            body: "Body must not be empty"
        })
    }

    // Récupération des parametres POST
    const newScream = {
        body: req.body.body,
        userHandle: req.user.handle,
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

// ======================
// Fonctions helper
// ======================

const isEmpty = (string) => {
    // .trim() permet de retirer les blancs en début et fin de chaîne
    return string.trim() === '';
}

const isEmail = (string) => {
    // Expression régulière vérifiant que le format du string soit une adresse email
    const emailRegEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

    return string.match(emailRegEx);
}

// Route d'inscription (signup)
app.post('/signup', (req, res) => {
    // Création d'un objet newUser
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle
    }

    let errors = {};

    // Vérifications email, erreurs si:

    // Email vide
    if(isEmpty(newUser.email)){
        errors.email = "Must not be empty";
    }
    // Texte passé n'est pas au format email
    else if(!isEmail(newUser.email)){
        errors.email = "Must be a valid email adress";
    }

    // Vérifications mdps et confirmation mdp, erreurs si:

    // Mdp vide
    if(isEmpty(newUser.password)){
        errors.password = "Must not be empty";
    }
    // Mdp et confirmation mdp ne concordent pas
    if(newUser.password != newUser.confirmPassword){
        errors.confirmPassword = "Passwords must match";
    }

    // Vérifications handle, erreurs si:
    // Le handle est vide
    if(isEmpty(newUser.handle)){
        errors.handle = "Must not be empty";
    }

    // Si des erreurs sont trouvées, retourner une 400 (bad request), et retourner un JSON des erreurs
    if(Object.keys(errors).length > 0){
        return res.status(400).json(errors);
    }

    // Si tout est bon, persistance du nouveau user:
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

// Route de login
app.post("/login", (req, res) => {
    const user = {
        email: req.body.email,
        password: req.body.password,
    };

    let errors = {};

    // Email vide
    if(isEmpty(user.email)){
        errors.email = "Must not be empty";
    }
    // Texte passé n'est pas au format email
    else if(!isEmail(user.email)){
        errors.email = "Must be a valid email adress";
    }

    // Vérifications mdps, erreurs si:

    // Mdp vide
    if(isEmpty(user.password)){
        errors.password = "Must not be empty";
    }

    // Si des erreurs sont trouvées, retourner une 400 (bad request), et retourner un JSON des erreurs
    if(Object.keys(errors).length > 0){
        return res.status(400).json(errors);
    }

    // Sinon, connexion.
    firebase
    .auth()
    .signInWithEmailAndPassword(user.email, user.password)
    // Si connexion OK, récupération du token:
    .then(data => {
        return data.user.getIdToken();
    })
    .then(idToken => {
        return res.json({
            token: idToken
        });
    })
    // Sinon, retour d'une erreur
    .catch(err => {
        // Si mauvais mdp, retour d'une 403 (not authorized)
        if(err.code === "auth/wrong-password"){
            return res.status(403).json({
                general: "Wrong credentials, please try again"
            })
        }

        console.error(err);
        return res.status(500).json({
            error: err.code
        })
    })
});

exports.api = functions.region('europe-west1').https.onRequest(app);