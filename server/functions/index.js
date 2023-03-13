const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const dbRef = admin.firestore().doc("tokens/demo");

const TwitterApi = require("twitter-api-v2").default;
const twitterClient = new TwitterApi({
  clientId: "RlFKWmFfOHJoRnNuR2hFZVVjVGs6MTpjaQ",
  clientSecret: "pwpIkY1sHdJ3yjwfLwytLS2NUZ76R5i4VD70wr3hQKq13W69zw",
});

const callbackURL = "http://localhost:5000/tfa-backend/us-central1/callback";
 
exports.auth = functions.https.onRequest((request, response) => {
  const { url, codeVerifier, state } = twitterClient.generateOAuth2AuthLink(
    callbackURL,
    { scope: ["tweet.read"] }
  );
  dbRef.set({ codeVerifier, state });

  response.redirect(url);
});
exports.callback = functions.https.onRequest((request, response) => {});
exports.tweet = functions.https.onRequest((request, response) => {});
