const { admin, db } = require('./admin');

// Création d'un middelware FBAuth (Firabase Authentication)
module.exports = (req, res, next) => {
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
        req.user.imageUrl = data.docs[0].data().imageUrl
        // La requête dans laquelle est passée le middleware peut continuer 
        // ex: app.post("/scream", FBAuth...
        return next();
    })
    .catch(err => {
        console.error('Error while verifyng token');
        return res.status(403).json({err});
    })
}