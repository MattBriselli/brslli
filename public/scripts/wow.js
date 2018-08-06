$(document).on("ready", function () {
    handleLogin();
});


function handleLogin() {
    var auth = firebase.auth();
    firebase.auth().onAuthStateChanged(function(user) {
          if (user) {
            // User is signed in.
            console.log('signed in');
            console.log(auth.currentUser);
          } else {
            // No user is signed in.
            console.log('not signed in');
            firebase.auth().setPersistence(firebase.auth.Auth.Persistence.SESSION)
                .then(function() {
                    // Existing and future Auth states are now persisted in the current
                    // session only. Closing the window would clear any existing state even
                    // if a user forgets to sign out.
                    // ...
                    // New sign-in will be persisted with session persistence.


                    console.log("else");
                    firebase.auth().signInWithEmailAndPassword("mattbriselli@gmail.com", "pwdpwd").catch(function(error) {
                        // Handle Errors here.
                        var errorCode = error.code;
                        var errorMessage = error.message;
                    }).then(function() {
                        console.log(firebase.auth().currentUser);
                        firebase.auth().setPersistence(firebase.auth.Auth.Persistence.SESSION);
                    });
                });
          }
    });
}