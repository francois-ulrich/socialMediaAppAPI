const { db } = require('../util/admin');

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