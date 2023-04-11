const admin = require("firebase-admin");
const dotenv = require("dotenv");
dotenv.config();
admin.initializeApp();

const functions = require("firebase-functions");

import { TwitterAuthProvider } from "firebase/auth";
//end packages
const db = admin.firestore();
const usersCollection = db.collection("users");

const saveUser = async (userId, userData) => {
  const userRef = usersCollection.doc(userId);
  await userRef.set(userData);
};

const { TwitterApi } = require("twitter-api-v2");

const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

//firebase auth
const auth = getAuth();

const getUserData = async (username) => {
  const user = await client.v2.userByUsername(username).then((res) => res.data);
  console.log(user);
  return {
    name: user.name,
    username: user.username,
    followers: user.public_metrics.followers_count,
    following: user.public_metrics.following_count,
    tweetCount: user.public_metrics.tweet_count,
    description: user.description,
    location: user.location,
    profileImageUrl: user.profile_image_url,
    verified: user.verified,
  };
};

const saveTwitterUser = async (username) => {
  const userData = await getUserData(username);
  await saveUser(userData.username, userData);
};

exports.firebaseAuthTest = functions.https.onRequest((req, res) => {
  signInWithPopup(auth, provider)
    .then((result) => {
      // This gives you a the Twitter OAuth 1.0 Access Token and Secret.
      // You can use these server side with your app's credentials to access the Twitter API.
      const credential = TwitterAuthProvider.credentialFromResult(result);
      const token = credential.accessToken;
      const secret = credential.secret;

      // The signed-in user info.
      const user = result.user;
      // IdP data available using getAdditionalUserInfo(result)
      // ...
    })
    .catch((error) => {
      // Handle Errors here.
      const errorCode = error.code;
      const errorMessage = error.message;
      // The email of the user's account used.
      const email = error.customData.email;
      // The AuthCredential type that was used.
      const credential = TwitterAuthProvider.credentialFromError(error);
      // ...
    });
});

exports.saveTwitterUser = functions.https.onRequest((req, res) => {
  saveTwitterUser("enginowhere").then(() =>
    console.log("Kullanıcı Firestore'a kaydedildi.")
  );
  res.send("Kullanıcı Firestore'a kaydedildi.");
});
