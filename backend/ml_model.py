import joblib
from sklearn.metrics.pairwise import cosine_similarity

# Load Model
model = joblib.load("issue_model.pkl")

# Load Vectorizer
vectorizer = joblib.load("vectorizer.pkl")


# -------------------------
# ISSUE PREDICTION
# -------------------------
def predict_issue(text):

    text = str(text).lower()

    vector = vectorizer.transform([text])

    prediction = model.predict(vector)

    return prediction[0]


# -------------------------
# ISSUE + CONFIDENCE
# -------------------------
def predict_issue_with_confidence(text):

    text = str(text).lower()

    vector = vectorizer.transform([text])

    prediction = model.predict(vector)[0]

    try:

        probabilities = model.predict_proba(vector)

        confidence = max(probabilities[0]) * 100

        return prediction, round(confidence, 2)

    except:

        return prediction, 0.0


# -------------------------
# DUPLICATE COMPLAINT CHECK
# -------------------------
def count_similar_complaints(
    text,
    existing_texts,
    threshold=0.7
):

    if not existing_texts:
        return 0

    text = str(text).lower()

    existing_texts = [
        str(x).lower()
        for x in existing_texts
    ]

    vectors = vectorizer.transform(
        [text] + existing_texts
    )

    similarities = cosine_similarity(
        vectors[0],
        vectors[1:]
    )[0]

    return int(
        (similarities >= threshold).sum()
    )