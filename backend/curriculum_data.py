"""Static curriculum shells. Lesson/exercise content is AI-generated on demand and cached."""

SUBJECTS = [
    {
        "key": "math",
        "name": "Mathematics",
        "icon": "Calculator",
        "blurb": "Numbers, patterns, and problem solving.",
        "chapters": [
            {"key": "number-sense", "title": "Number Sense"},
            {"key": "fraction-power", "title": "Fraction Power"},
            {"key": "geometry-basics", "title": "Geometry Basics"},
            {"key": "data-thinking", "title": "Data Thinking"},
        ],
    },
    {
        "key": "english",
        "name": "English",
        "icon": "BookOpen",
        "blurb": "Reading, writing, and language mastery.",
        "chapters": [
            {"key": "reading-fluency", "title": "Reading Fluency"},
            {"key": "grammar-rules", "title": "Grammar Rules"},
            {"key": "story-craft", "title": "Story Craft"},
            {"key": "vocabulary-builder", "title": "Vocabulary Builder"},
        ],
    },
    {
        "key": "science",
        "name": "Science",
        "icon": "FlaskConical",
        "blurb": "Explore how the natural world works.",
        "chapters": [
            {"key": "living-things", "title": "Living Things"},
            {"key": "matter-energy", "title": "Matter Energy"},
            {"key": "earth-space", "title": "Earth Space"},
            {"key": "forces-motion", "title": "Forces Motion"},
        ],
    },
    {
        "key": "social",
        "name": "Social Studies",
        "icon": "Globe2",
        "blurb": "History, geography, and civics.",
        "chapters": [
            {"key": "world-geography", "title": "World Geography"},
            {"key": "ancient-history", "title": "Ancient History"},
            {"key": "civic-life", "title": "Civic Life"},
            {"key": "economic-basics", "title": "Economic Basics"},
        ],
    },
]

SUBJECT_MAP = {s["key"]: s for s in SUBJECTS}


def get_chapter(subject_key, chapter_key):
    subject = SUBJECT_MAP.get(subject_key)
    if not subject:
        return None, None
    for ch in subject["chapters"]:
        if ch["key"] == chapter_key:
            return subject, ch
    return subject, None


US_STATES = [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
    "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
    "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine",
    "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi",
    "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey",
    "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
    "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina",
    "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia",
    "Washington", "West Virginia", "Wisconsin", "Wyoming",
]
