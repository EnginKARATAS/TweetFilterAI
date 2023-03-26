import tweepy
import firebase_admin
from firebase_admin import credentials, firestore
import openai
from flask import Flask, jsonify

# Twitter API anahtarları
consumer_key = 'TwHZLdPid6ysqLkiCM4bjwdsk'
consumer_secret = 'MWF8dcYUfvqiktbIaPqxofT0mds9lhQ2DKH7CJiieFkHh45Hpu'
access_token = '1374444599461113862-4F4e1Bn79Wiq7c0bx98WSWC7hN0yh0'
access_token_secret = 'HBVd6X6996aDRDHV6FoZ3sXlqE9tEj6a11ewD5HsWUNgh'


# Firebase bağlantısı
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# OpenAI API anahtarı
openai.api_key = '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'

# Twitter API'ye bağlanma
auth = tweepy.OAuthHandler(consumer_key, consumer_secret)
auth.set_access_token(access_token, access_token_secret)
api = tweepy.API(auth)

# Tweetleri Firebase veritabanına kaydetme
def save_tweets_to_firebase(tweets, username):
    for tweet in tweets:
        doc_ref = db.collection(username).document(tweet.id_str)
        doc_ref.set({
            'id': tweet.id_str,
            'text': tweet.text,
            'created_at': tweet.created_at
        })

# Tweetleri OpenAI API'si ile filtreleme
def filter_tweets_with_openai(tweets):
    filtered_tweets = []
    for tweet in tweets:
        response = openai.Completion.create(
            engine="gpt-3.5-turbo",
            prompt=tweet.text,
            max_tokens=60,
            n=1,
            stop=None,
            temperature=0.5,
        )

        if response.choices[0].text != '':
            filtered_tweets.append({
                'id': tweet.id_str,
                'text': response.choices[0].text,
                'created_at': tweet.created_at
            })
    return filtered_tweets

# Flask API'si
app = Flask(__name__)

@app.route('/<test>', methods=['GET'])
def get_filtered_tweets(test):
    # Tweetleri çekme
    tweets = api.user_timeline(screen_name="enginowhere", count=5)
    for tweet in tweets:
        print(tweet.text)

    # Tweetleri Firebase veritabanına kaydetme
    save_tweets_to_firebase(tweets, test)

    # Tweetleri OpenAI API'si ile filtreleme
    filtered_tweets = filter_tweets_with_openai(tweets)

    # Filtrelenmiş tweetleri Flask API'si olarak sunma
    return jsonify(filtered_tweets)

if __name__ == '__main__':
    app.run(debug=True)
