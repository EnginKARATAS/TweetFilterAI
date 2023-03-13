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
exports.auth = functions.https.onRequest((request, response) => {
  const { url, codeVerifier, state } = twitterClient.generateOAuth2AuthLink(
    callbackURL,
    { scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'] }
  );

  dbRef.set({ codeVerifier, state })
    .then(() => {
      response.redirect(url);
    })
    .catch((error) => {
      console.error(error);
      response.status(500).send('Error setting code verifier and state');
    });
});

exports.callback = functions.https.onRequest((request, response) => {
  const { state, code } = request.query;

  dbRef.get()
    .then((dbSnapshot) => {
      const { codeVerifier, state: storedState } = dbSnapshot.data();

      if (state !== storedState) {
        return response.status(400).send('Stored tokens do not match!');
      }

      return twitterClient.loginWithOAuth2({
        code,
        codeVerifier,
        redirectUri: callbackURL,
      });
    })
    .then(({ client: loggedClient, accessToken, refreshToken }) => {
      return dbRef.set({ accessToken, refreshToken })
        .then(() => loggedClient.v2.me());
    })
    .then(({ data }) => {
      response.send(data);
    })
    .catch((error) => {
      console.error(error);
      response.status(500).send('Error refreshing OAuth2 token or fetching user data');
    });
});

exports.tweet = functions.https.onRequest((request, response) => {
  dbRef.get()
    .then(({ data: { refreshToken } }) => {
      return twitterClient.refreshOAuth2Token(refreshToken);
    })
    .then(({ client: refreshedClient, accessToken, refreshToken: newRefreshToken }) => {
      return dbRef.set({ accessToken, refreshToken: newRefreshToken })
        .then(() => openai.createCompletion('text-davinci-001', {
          prompt: 'tweet something cool for #techtwitter',
          max_tokens: 64,
        }))
        .then(({ data: { choices } }) => refreshedClient.v2.tweet(choices[0].text));
    })
    .then(({ data }) => {
      response.send(data);
    })
    .catch((error) => {
      console.error(error);
      response.status(500).send('Error refreshing OAuth2 token or posting tweet');
    });
});
