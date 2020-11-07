const { admin, db } = require('../util/admin');

const firebaseConfig = require('../util/config');

const firebase = require("firebase");
firebase.initializeApp(firebaseConfig);

const { validateSignupData, validateLoginData, reduceUserDetails} = require('../util/validators');

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

    const defaultProfilePicture = "default-pp.png";

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
                    imageUrl: `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${defaultProfilePicture}?alt=media`,
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
                    return res.status(500).json({
                        general: "Something went wrong, please try again."
                    });
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
        return res
        .status(403)
        .json({
            general: "Wrong credentials, please try again"
        })
    })
};

// Ajout des informations de l'utilisateur
exports.addUserDetails = (req, res) => {
    let userDetails = reduceUserDetails(req.body);

    // Récupération du user
    db
    .doc(`/users/${req.user.handle}`)
    .update(userDetails)
    .then(()=>{
        return res.json({
            message: 'Details added successfuly'
        });
    })
    .catch(err => {
        console.error(err);

        return res.status(500).json({error: err.code});
    })
}

// Récupération des informations de l'utilisateur authentifié
exports.getAuthenticatedUser = (req, res) => {
    // Objet contenant les infos utilisateur
    let userData = {};

    console.log("req.user.handle");
    console.log(req.user.handle);

    // Récupération de l'utilisateur
    db.doc(`/users/${req.user.handle}`)
    .get()
    .then(doc => {
        if(doc.exists){
            // Ajout dans l'objet
            userData.credentials = doc.data();

            // console.log("userData");
            // console.log(userData);

            // Récupération des likes
            return db.collection('likes')
            .where('userHandle', '==', req.user.handle)
            .get();
        }
        else{
            return res.status(404).json({
                error: "User not found"
            })
        }
    })
    .then(data => {
        // Création d'un attribut likes listant les likes 
        userData.likes = [];

        // Ajout de chaque objet like à l'objet utilisateur 
        data.forEach(doc => {
            userData.likes.push(doc.data());
        });

        // Récupération des notifications
        return db.collection('notifications')
        .where('recipient', '==', req.user.handle)
        .orderBy('createdAt', 'desc')
        .get();
    })
    .then(data => {
        // Création d'un attribut notifications listant les notifications reçues par l'utilisateur
        userData.notifications = [];

        // Ajout de chaque objet like à l'objet utilisateur 
        data.forEach(doc => {
            // userData.notifications.push(doc.data());
            userData.notifications.push({
                recipient: doc.data().recipient,
                sender: doc.data().sender,
                read: doc.data().read,
                screamId: doc.data().screamId,
                type: doc.data().type,
                createdAt: doc.data().createdAt,
                notificationId: doc.id
            });
        });

        // Retour des données
        return res.json(userData);
    })
    // Retour d'erreur
    .catch(err => {
        console.error(err);

        return res.status(500).json({error: err.code});
    });
}

// Upload d'une image de profil
exports.uploadImage = (req, res) => {
    const BusBoy = require('busboy');

    const path = require("path");
    const os = require("os");
    const fs = require("fs");

    const busboy = new BusBoy({ headers: req.headers })

    let imageFilename;
    let imageToBeUploaded = {};

    // Upload de fishier
    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
        if(mimetype !== "image/jpeg" && mimetype !== "image/png"){
            console.log("mimetype");
            console.log(mimetype);
            return res.status(400).json({
                error: 'Wrong file type submitted'
            });
        }

        // Création du string du nom du fichier image, de type "image.png"
        
        // Récupération de l'extension du fichier
        const splitedFilename = filename.split('.');
        const imageExtension = splitedFilename[splitedFilename.length - 1];
        // Le nom du fichier sera une suite de chiffres random du type 654653422644689.png
        imageFilename = `${Math.round( Math.random() * 100000000000000)}.${imageExtension}`;

        // os.tmpdir() = Returns the operating system's default directory for temporary files as a string.
        const filepath = path.join(os.tmpdir(), imageFilename);
        imageToBeUploaded = {filepath, mimetype};

        // Utilisation du file system de NodeJS pour créer le fichier
        file.pipe(fs.createWriteStream(filepath))
    });

    busboy.on('finish', () => {
        admin.storage().bucket(firebaseConfig.storageBucket).upload(imageToBeUploaded.filepath, {
            resumable: false,
            metadata: {
                metadata:{
                    contentType: imageToBeUploaded.mimetype
                }
            }
        })
        .then(() => {
            // alt=media affiche le fichier dans le navigateur à la place de le télécharger le fichier
            const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${imageFilename}?alt=media`;
            // Update des document de l'utilisateur authentifié: Ajout / update d'une propriété imageUrl
            return db.doc(`/users/${req.user.handle}`).update({ imageUrl });
        })
        .then(() => {
            return res.json({message: "Image uploaded successfuly"})
        })
        .catch((err) => {
            console.error(err);
            return res.status(500).json({
                error: err.code
            })
        })
    });

    busboy.end(req.rawBody);
}

// Get any user's details
exports.getUserDetails = (req, res) => {
    // Objet contenant les infos utilisateur
    let userData = {};

    // Récupération de l'utilisateur
    db.doc(`/users/${req.params.handle}`)
    .get()
    .then(doc => {
        if(doc.exists){
            // Ajout dans l'objet
            userData.credentials = doc.data();

            // Récupération des screams
            return db.collection('screams')
            .where('userHandle', '==', req.params.handle)
            .orderBy('createdAt', 'desc')
            .get();
        }
        else{
            return res.status(404).json({
                error: "User not found"
            })
        }
    })
    .then(data => {
        // Création d'un attribut likes listant les likes 
        userData.screams = [];

        // Ajout de chaque objet like à l'objet utilisateur 
        data.forEach(doc => {
            userData.screams.push({
                body: doc.data().body,
                createdAt: doc.data().createdAt,
                userHandle: doc.data().userHandle,
                userImage: doc.data().userImage,
                likeCount: doc.data().likeCount,
                commentCount: doc.data().commentCount,
                screamId: doc.id
            });
        });

        // Retour des données
        return res.json(userData);
    })
    .catch(err => {
        console.error(err);

        return res.status(500).json({error: err.code});
    });
}

exports.markNotificationsRead = (req, res) => {
    // Batch: permet d'update plusieurs documents à la fois
    let batch = db.batch();

    req.body.forEach(notificationId => {
        const notification = db.doc(`/notifications/${notificationId}`);
        batch.update(notification, {read: true});
    });

    // Application des changements à la BDD
    batch.commit()
    // Message de retour
    .then(()=>{
        return res.json({
            message: 'Notifications marked read'
        })
    })

    // En cas d'erreur: code 500 & message d'erreur
    .catch((err) => {
    console.error(err);
        res.status(500).json({ error: err.code });
    });
}