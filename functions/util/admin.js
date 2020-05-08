const admin = require('firebase-admin'); // Pour accès à la BDD

const adminConfig = {
    credential: admin.credential.applicationDefault(), // Crédentials à mettre en place via Google Cloud SDK Shell,
    databaseURL: 'https://database-name.firebaseio.com'
}

// Il faut initialiser l'application pour pouvoir avoir accès aux fonctionnalités admin
admin.initializeApp(adminConfig);

const db = admin.firestore();

module.exports = {admin, db};