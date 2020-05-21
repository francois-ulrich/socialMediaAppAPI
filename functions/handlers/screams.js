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
            // screams.push(doc.data());

            screams.push({
                screamId: doc.id,
                body: doc.data().body,
                userHandle: doc.data().userHandle,
                createdAt: doc.data().createdAt,
                commentCount: doc.data().commentCount,
                likeCount: doc.data().likeCount,
                userImage: doc.data().userImage,
            })
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
        userImage: req.user.imageUrl,
        createdAt: new Date().toISOString(),
        likeCount: 0,
        commentCount: 0,
    }

    // Envoi du nouveau post en base de donnée
    db
    .collection('screams')
    // Ajout du nouveau post à la requête
    .add(newScream)
    // Message de retour
    .then((doc) => {
        const resScream = newScream;
        resScream.screamId = doc.id;

        res.json(resScream);
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
        return res.status(400).json({ comment: 'Must not be empty'})
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

        // Update du nombre de commentaire
        return doc.ref.update({ 
            commentCount: doc.data().commentCount + 1 
        });
    })
    .then(() => {
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

// Ajout d'un like à un scream
exports.likeScream = (req, res) => {
    // Récupération d'un like existant pour l'utilisateur / le scream donné
    const likeDocument = db.collection('likes')
    .where('userHandle', '==', req.user.handle)
    .where('screamId', '==', req.params.screamId)
    .limit(1);

    // Récupération du scream
    const screamDocument = db.doc(`/screams/${req.params.screamId}`);

    let screamData;

    screamDocument.get()
    .then(doc => {
        // Si il existe, récup de ses données
        if(doc.exists){
            screamData = doc.data();
            screamData.screamId = doc.id;

            return likeDocument.get();
        }
        // Sinon retourne 404
        else{
            return res
            .status(404)
            .json({
                error: "Scream not found"
            })
        }
    })
    .then(data => {
        if(req.user.handle !== screamData.userHandle){
            if(data.empty){
                return db.collection('likes').add({
                    screamId: req.params.screamId,
                    userHandle: req.user.handle
                })
                .then(() => {
                    screamData.likeCount++;

                    return screamDocument.update({
                        likeCount:  screamData.likeCount
                    })
                })
                .then(() => {
                    return res.json(screamData)
                })
            }else{
                return res.status(400).json({error: "Scream already liked"})
            }
        }else{
            return res.status(400).json({error: "User can't like one of his own screams"})
        }
    })
    // En cas d'erreur: code 500 & message d'erreur
    .catch((err) => {
        res.status(500).json({ error: 'something went wrong' });
        console.error(err);
    });
}

// Retrait d'un like d'un scream
exports.unlikeScream = (req, res) => {
    // Récupération d'un like existant pour l'utilisateur / le scream donné
    const likeDocument = db.collection('likes')
    .where('userHandle', '==', req.user.handle)
    .where('screamId', '==', req.params.screamId)
    .limit(1);

    // Récupération du scream
    const screamDocument = db.doc(`/screams/${req.params.screamId}`);

    let screamData;

    screamDocument.get()
    .then(doc => {
        // Si il existe, on peut le supprimmer
        if(doc.exists){
            screamData = doc.data();
            screamData.screamId = doc.id;

            return likeDocument.get();
        }
        // Sinon retourne 404
        else{
            return res
            .status(404)
            .json({
                error: "Scream not found"
            })
        }
    })
    .then(data => {
        if(data.empty){
            return res.status(400).json({error: "Scream was not liked"})
        }else{
            return db.doc(`/likes/${data.docs[0].id}`).delete()
            .then(() => {
                screamData.likeCount--

                return screamDocument.update({
                    likeCount:  screamData.likeCount
                })
            })
            .then(() => {
                return res.json(screamData)
            })
        }
    })
    // En cas d'erreur: code 500 & message d'erreur
    .catch((err) => {
        res.status(500).json({ error: 'something went wrong' });
        console.error(err);
    });
}

exports.deleteScream = (req, res) => {
    const document = db.doc(`/screams/${req.params.screamId}`);

    document.get()
    .then(doc => {
        if(!doc.exists){
            return res
            .status(404)
            .json({
                error: "Scream not found"
            })
        }

        if(doc.data().userHandle !== req.user.handle){
            return res
            .status(403)
            .json({
                error: "Unauthorized"
            })
        }else{
            return document.delete();
        }
    })
    .then(() => {
        res.json({message: 'Scream deleted successfully'})
    })
    // En cas d'erreur: code 500 & message d'erreur
    .catch((err) => {
        res.status(500).json({ error: 'something went wrong' });
        console.error(err);
    });
}