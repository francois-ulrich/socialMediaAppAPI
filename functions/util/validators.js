const isEmpty = (string) => {
    // .trim() permet de retirer les blancs en début et fin de chaîne
    return string.trim() === '';
}

const isEmail = (string) => {
    // Expression régulière vérifiant que le format du string soit une adresse email
    const emailRegEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

    return string.match(emailRegEx);
}

exports.validateLoginData = (data) => {
    let errors = {};

    // Email vide
    if(isEmpty(data.email)){
        errors.email = "Must not be empty";
    }
    // Texte passé n'est pas au format email
    else if(!isEmail(data.email)){
        errors.email = "Must be a valid email adress";
    }

    // Vérifications mdps, erreurs si:

    // Mdp vide
    if(isEmpty(data.password)){
        errors.password = "Must not be empty";
    }

    return {
        errors,
        valid: Object.keys(errors).length === 0
    }
}

exports.validateSignupData = (data) => {
    let errors = {};
    
    // Email vide
    if(isEmpty(data.email)){
        errors.email = "Must not be empty";
    }
    // Texte passé n'est pas au format email
    else if(!isEmail(data.email)){
        errors.email = "Must be a valid email adress";
    }

    // Vérifications mdps et confirmation mdp, erreurs si:

    // Mdp vide
    if(isEmpty(data.password)){
        errors.password = "Must not be empty";
    }
    // Mdp et confirmation mdp ne concordent pas
    if(data.password != data.confirmPassword){
        errors.confirmPassword = "Passwords must match";
    }

    // Vérifications handle, erreurs si:
    // Le handle est vide
    if(isEmpty(data.handle)){
        errors.handle = "Must not be empty";
    }

    return {
        errors,
        valid: Object.keys(errors).length === 0
    }
}

exports.reduceUserDetails = (data) => {
    let userDetails = {};

    // Récupération du user bio si il n'est pas vide
    if(!isEmpty(data.bio.trim()))
        userDetails.bio = data.bio;

    // Récupération du site web
    if(!isEmpty(data.website.trim())){
        // Si il n'y a pas de http:// présent en début de chaine de caractère, ajout de ce dernier
        if( data.website.trim().substring(0,4) !== 'http' ){
            userDetails.website = `http://${data.website.trim()}`;
        }
        else{
            userDetails.website = data.website.trim();
        }
    }

    // Récupération du user bio si il n'est pas vide
    if(!isEmpty(data.location.trim()))
        userDetails.location = data.location;

    return userDetails;
}