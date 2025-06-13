/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const functions = require("firebase-functions");

exports.helloWorld = functions.https.onRequest((req, res) => {
  res.json({msg: "Hello, Jayden!"});
});

const admin = require("firebase-admin");
admin.initializeApp();

exports.addNote = functions.https.onRequest(async (req, res) => {
  const text = req.query.text || "empty";
  const docRef = await admin.firestore().collection("notes").add({text, ts: Date.now()});
  res.json({id: docRef.id, text});
});


// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
