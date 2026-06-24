from textblob import TextBlob
import spacy
import re

from ml_model import (
    predict_issue,
    predict_issue_with_confidence,
    count_similar_complaints as ml_count_similar_complaints,
)

nlp = spacy.load("en_core_web_sm")


# --------------------------------
# AREA EXTRACTION
# --------------------------------
def extract_area(text):

    match = re.search(
        r"\bin\s+([A-Za-z\s,]+)$",
        text,
        re.IGNORECASE
    )

    if match:
        return match.group(1).strip().title()

    doc = nlp(text)

    for ent in doc.ents:

        if ent.label_ in ["GPE", "LOC"]:
            return ent.text.title()

    return "Unknown"


# --------------------------------
# SENTIMENT ANALYSIS
# --------------------------------
def get_sentiment(text):

    complaint_words = [

        "problem",
        "issue",
        "shortage",
        "theft",
        "crime",
        "robbery",
        "kidnap",
        "kidnapping",
        "abduction",
        "human trafficking",
        "child marriage",
        "child labour",
        "child labor",
        "garbage",
        "pollution",
        "accident",
        "traffic",
        "water",
        "broken",
        "damage",
        "delay",
        "flood",
        "complaint",
        "murder",
        "unsafe",
        "power cut",
        "electricity cut",
        "drainage",
        "pothole",
        "sewage",
        "overflow",
        "street light",
        "illegal",
        "encroachment",
        "mosquito",
        "violence",
        "harassment",
        "assault"
    ]

    text_lower = text.lower()

    for word in complaint_words:

        if word in text_lower:
            return "Negative"

    polarity = TextBlob(text).sentiment.polarity

    if polarity > 0:
        return "Positive"

    elif polarity < 0:
        return "Negative"

    return "Neutral"


# --------------------------------
# ISSUE DETECTION
# --------------------------------
def detect_issue(text):

    text_lower = text.lower()

    # Crime Related

    if any(word in text_lower for word in [
        "kidnap",
        "kidnapping",
        "abduction",
        "missing child",
        "children missing",
        "hostage"
    ]):
        return "Kidnapping"

    if any(word in text_lower for word in [
        "human trafficking",
        "trafficking"
    ]):
        return "Human Trafficking"

    if any(word in text_lower for word in [
        "child marriage",
        "underage marriage",
        "minor girl marriage",
        "early marriage"
    ]):
        return "Child Marriage"

    if any(word in text_lower for word in [
        "child labour",
        "child labor",
        "children working",
        "minor working"
    ]):
        return "Child Labour"

    if any(word in text_lower for word in [
        "domestic violence",
        "family violence",
        "wife beating"
    ]):
        return "Domestic Violence"

    # Electricity

    if any(word in text_lower for word in [
        "electricity",
        "power cut",
        "power outage",
        "load shedding",
        "no power",
        "electric power",
        "frequent current cut"
    ]):
        return "Power"
    "chain snatching",
    "snatching",
    "theft",
    "robbery",
    "burglary",
    "crime",
    "stolen",
    "pickpocket",
    "pick pocket",
    "mugging",
    "chain theft"
    # ML Prediction

    return predict_issue(text)


def get_issue_confidence(text):

    issue, confidence = predict_issue_with_confidence(text)

    if confidence < 30:
        return "Needs More Training Data"

    return f"{confidence:.1f}%"



# --------------------------------
# DUPLICATE CHECK
# --------------------------------
def count_similar_complaints(
    text,
    existing_texts,
    threshold=0.7
):

    return ml_count_similar_complaints(
        text,
        existing_texts,
        threshold
    )


# --------------------------------
# PRIORITY
# --------------------------------
def get_priority(issue):

    high_priority = [

        "Crime",
        "Kidnapping",
        "Human Trafficking",
        "Child Marriage",
        "Child Labour",
        "Domestic Violence",
        "Women Safety",

        "Power",
        "Electricity",

        "Water",
        "Flood",

        "Medical",
        "Fire",

        "Drainage",
        "Sewage"
    ]

    medium_priority = [

        "Transport",
        "Infrastructure",
        "Road",
        "Street Light",
        "Waste",
        "Pollution",
        "Environment",
        "Encroachment",
        "Illegal Construction"
    ]

    if issue in high_priority:
        return "High"

    elif issue in medium_priority:
        return "Medium"

    return "Low"


# --------------------------------
# SEVERITY
# --------------------------------
def get_severity(text, issue):

    text_lower = text.lower()

    critical_words = [

        "death",
        "murder",
        "fire",
        "collapse",
        "kidnap",
        "kidnapping",
        "abduction",
        "human trafficking",
        "fatal",
        "injury",
        "accident"
    ]

    for word in critical_words:

        if word in text_lower:
            return "Critical"

    if issue in [

        "Kidnapping",
        "Human Trafficking",
        "Child Marriage",
        "Crime",
        "Medical",
        "Fire"

    ]:
        return "High"

    if issue in [

        "Power",
        "Water",
        "Flood",
        "Drainage",
        "Pollution"

    ]:
        return "Medium"

    return "Low"


# --------------------------------
# DEPARTMENT MAPPING
# --------------------------------
def get_department(issue):

    departments = {

        "Water":
            "Water Supply Board",

        "Transport":
            "Transport Department",

        "Waste":
            "Municipal Waste Department",

        "Pollution":
            "Pollution Control Board",

        "Environment":
            "Environmental Department",

        "Infrastructure":
            "Public Works Department",

        "Road":
            "Highways Department",

        "Power":
            "Electricity Board",

        "Electricity":
            "Electricity Board",

        "Street Light":
            "Electrical Maintenance Department",

        "Flood":
            "Disaster Management Department",

        "Drainage":
            "Drainage Department",

        "Sewage":
            "Drainage Department",

        "Medical":
            "Health Department",

        "Fire":
            "Fire Department",

        "Crime":
            "Police Department",

        "Kidnapping":
            "Police Department",

        "Human Trafficking":
            "Police Department",

        "Cyber Crime":
            "Cyber Crime Cell",

        "Child Marriage":
            "Women and Child Development Department",

        "Child Labour":
            "Labour Department",

        "Domestic Violence":
            "Women Protection Cell",

        "Women Safety":
            "Women Protection Cell",

        "Animal Welfare":
            "Animal Welfare Department",

        "Food Safety":
            "Food Safety Department",

        "Illegal Construction":
            "Town Planning Department",

        "Encroachment":
            "Revenue Department"
    }

    return departments.get(
        issue,
        "Municipal Corporation"
    )