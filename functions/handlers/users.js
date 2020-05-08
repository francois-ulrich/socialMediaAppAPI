const { db } = require('../util/admin');

const firebaseConfig = require('../util/config');

const firebase = require("firebase");
firebase.initializeApp(firebaseConfig);

const { validateSignupData, validateLoginData} = require('../util/validators');

// Route d'inscription (signup)
exports.signup = (req, res) => {
    // Création d'un objet newUser
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle
    }

    const { valid, errors } = validateSignupData(newUser);

    if(!valid)
        return res.status(400).json(errors);

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
};


// Route de login
exports.login = (req, res) => {
    const user = {
        email: req.body.email,
        password: req.body.password,
    };

    const { valid, errors } = validateLoginData(user);

    if(!valid)
        return res.status(400).json(errors);
  
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
};