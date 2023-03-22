const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const dbRef = admin.firestore().doc("tokens/demo");

const Twitter = require("twitter-lite");
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
    { scope: ["tweet.read", "tweet.write", "users.read", "offline.access"] }
  );

  dbRef
    .set({ codeVerifier, state })
    .then(() => {
      response.redirect(url);
    })
    .catch((error) => {
      console.error(error);
      response.status(500).send("Error setting code verifier and state");
    });
});

exports.callback = functions.https.onRequest((request, response) => {
  const { state, code } = request.query;

  dbRef
    .get()
    .then((dbSnapshot) => {
      const { codeVerifier, state: storedState } = dbSnapshot.data();

      if (state !== storedState) {
        return response.status(400).send("Stored tokens do not match!");
      }

      return twitterClient.loginWithOAuth2({
        code,
        codeVerifier,
        redirectUri: callbackURL,
      });
    })
    .then(
      ({
        client: loggedClient,
        accessToken,
        accessTokenSecret,
        refreshToken,
      }) => {
        return dbRef
          .set({ accessToken, refreshToken })
          .then(() => loggedClient.v2.me());
      }
    )
    .then(({ data }) => {
      response.send(data);
    })
    .catch((error) => {
      console.error(error);
      response
        .status(500)
        .send("Error refreshing OAuth2 token or fetching user data");
    });
});

//get tweets just for the user tweets twenty percent
exports.getTweets = functions.https.onRequest(async (request, response) => {
  const { refreshToken } = (await dbRef.get()).data();
  const {
    client: refreshedClient,
    accessToken,
    refreshToken: newRefreshToken,
  } = await twitterClient.refreshOAuth2Token(refreshToken);
  await dbRef.set({ accessToken, refreshToken: newRefreshToken });

  const { data } = await refreshedClient.v2.me();

  const client = new Twitter({
    access_token_key,
    access_token_secret,
    consumer_key: "RlFKWmFfOHJoRnNuR2hFZVVjVGs6MTpjaQ",
    consumer_secret: "pwpIkY1sHdJ3yjwfLwytLS2NUZ76R5i4VD70wr3hQKq13W69zw",
  });

  const user_id = data.id; // the user id whose tweets you want to retrieve
  const params = { user_id, exclude_replies: true, count: 10 }; // set the parameters for the API request

  client.get("statuses/user_timeline", params, (err, data, response) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log(data); // an array of tweet objects
  });

  response.send(tweets);
  // refreshedClient.v2
  //   .userTimeline(data.id, { exclude: "replies" })
  //   .then((tweets) => {
  //     response.send(tweets);
  //   });
});
// while (!userTimeline.done) {
//   for (const fetchedTweet of userTimeline) {
//     console.log(fetchedTweet.text);
//     await userTimeline.fetchNext();
//   }
// }
