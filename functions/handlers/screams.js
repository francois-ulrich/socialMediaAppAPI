const { db } = require('../util/admin');
const { isEmpty } = require('../util/validators');


exports.getAllScreams = (req, res) => {
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
};

// Requête POST: créer un post
exports.postOneScream = (req, res) => {
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
    });
};

// Récupération d'un scream et de ses commentaires
exports.getScream = (req, res) => {
    let screamData = {};

    // Récupération des données du scream
    db.doc(`/screams/${req.params.screamId}`)
    .get()
    .then(doc => {
        if(!doc.exists){
            // Retour d'un 404 not found si il n'existe pas
            return res.status(404).json({error: 'Scream not found'});
        }

        // Récupération de l'id du scream
        screamData = doc.data();
        screamData.screamId = doc.id;

        // Récupération des commentaires liés
        return db.collection('comments')
        .orderBy('createdAt','desc')
        .where('screamId', '==', req.params.screamId)
        .get();
    })
    .then(data => {
        // Ajout de tous les commentaires dans l'objet retourné
        screamData.comments = [];

        data.forEach(doc => {
            screamData.comments.push(doc.data())
        });

        return res.json(screamData)
    })
    // En cas d'erreur: code 500 & message d'erreur
    .catch((err) => {
        res.status(500).json({ error: err.code });
        console.error(err);
    });
}

// Ajout d'un commentaire à un scream
exports.commentOnScream = (req, res) => {
    // Erreur si le corps de texte envoyé est vide
    if( isEmpty( req.body.body ) ){
        // Retour d'un bad request
        return res.status(400).json({ error: 'Must not be empty'})
    }

    // Récupération des parametres POST
    const newComment = {
        userHandle: req.user.handle,
        userImage: req.user.imageUrl,
        screamId: req.params.screamId, 
        body: req.body.body,
        createdAt: new Date().toISOString(),
    }

    // Le scream doit exister pour qu'on y ajoute un commentaire
    db.doc( `/screams/${req.params.screamId}`)
    .get()
    .then(doc => {
        if(!doc.exists){
            return res.status(404).json({error: "Scream doesn't exist"})
        }

        // Envoi du nouveau post en base de donnée
        return db
        .collection('comments')
        // Ajout du nouveau post à la requête
        .add(newComment)
    })
    // Message de retour
    .then((doc) => {
        res.status(201).json({
            message: `document ${doc.id} created successfully`
        });
    })
    // En cas d'erreur: code 500 & message d'erreur
    .catch((err) => {
        res.status(500).json({ error: 'something went wrong' });
        console.error(err);
    });
    
}