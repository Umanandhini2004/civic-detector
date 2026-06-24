import pandas as pd
import joblib

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

# -------------------------
# LOAD DATASET
# -------------------------
df = pd.read_csv("civic_dataset_12000_rich.csv")# Remove empty rows
df = df.dropna()

# Complaint Text
X = df["complaint_text"]

# Category
y = df["category"]

# -------------------------
# TRAIN TEST SPLIT
# -------------------------
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y
)

# -------------------------
# TF-IDF
# -------------------------
vectorizer = TfidfVectorizer(
    stop_words="english",
    lowercase=True,
    ngram_range=(1, 3),
    min_df=2,
    max_df=0.95
)

X_train_vec = vectorizer.fit_transform(X_train)

X_test_vec = vectorizer.transform(X_test)

# -------------------------
# MODEL
# -------------------------
model = LogisticRegression(
    max_iter=5000,
    random_state=42
)

model.fit(
    X_train_vec,
    y_train
)

# -------------------------
# ACCURACY
# -------------------------
predictions = model.predict(
    X_test_vec
)

accuracy = accuracy_score(
    y_test,
    predictions
)

print(
    f"Accuracy: {accuracy*100:.2f}%"
)

# -------------------------
# SAVE MODEL
# -------------------------
joblib.dump(
    model,
    "issue_model.pkl"
)

joblib.dump(
    vectorizer,
    "vectorizer.pkl"
)

print("\nModel Trained Successfully")
print("issue_model.pkl created")
print("vectorizer.pkl created")