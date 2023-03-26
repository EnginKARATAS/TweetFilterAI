const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const dbRef = admin.firestore().doc("tokens/demo");
const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: "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",
});
const openai = new OpenAIApi(configuration);

const TwitterApi = require("twitter-api-v2").default;
const twitterClient = new TwitterApi({
  clientId: "RlFKWmFfOHJoRnNuR2hFZVVjVGs6MTpjaQ",
  clientSecret: "HPSqjSr5LKvwnE_7HBKBzPl4ulE298Em-Trt4g01W5QRnZOVH8",
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

// STEP 2 - Verify callback code, store access_token
exports.callback = functions.https.onRequest(async (request, response) => {
  const { state, code } = request.query;

  const dbSnapshot = await dbRef.get();
  const { codeVerifier, state: storedState } = dbSnapshot.data();

  if (state !== storedState) {
    return response.status(400).send("Stored tokens do not match!");
  }

  const {
    client: loggedClient,
    accessToken,
    refreshToken,
  } = await twitterClient.loginWithOAuth2({
    code,
    codeVerifier,
    redirectUri: callbackURL,
  });

  await dbRef.set({ accessToken, refreshToken });

  const { data } = await loggedClient.v2.me(); // start using the client if you want

  //giriş başarılı anasayfaya yönlendir. sonrasında tokenler ile istekte bulun
  response.send(data);
});

exports.tweet = functions.https.onRequest(async (request, response) => {
  const { refreshToken } = (await dbRef.get()).data();

  const {
    client: refreshedClient,
    accessToken,
    refreshToken: newRefreshToken,
  } = await twitterClient.refreshOAuth2Token(refreshToken);

  const history = [];

  await dbRef.set({ accessToken, refreshToken: newRefreshToken });

  const user_input = "I feel alone";
  const messages = [];
  for (const [input_text, completion_text] of history) {
    messages.push({ role: "user", content: input_text });
  }
  messages.push({ role: "user", content: user_input });

  try {
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: messages,
    });

    const completion_text = completion.data.choices[0].message.content;
    console.log(completion_text);

    history.push([user_input, completion_text]);
  } catch (error) {
    if (error.response) {
      console.log(error.response.status);
      console.log(error.response.data);
    } else {
      console.log(error.message);
    }
  }

  response.send(history);
});
