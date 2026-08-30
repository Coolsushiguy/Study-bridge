"""Adaptive assessment question banks. Difficulty 1 (easy / early grades) to 5 (hard / college-track).

Starting difficulty is calibrated to the student's self-declared grade; the first two
questions sit at that grade level, then the test adapts (harder on correct, easier on wrong).
"""

# ---------------- English leveling bank ----------------
ENGLISH_BANK = [
    # D1
    {"q": "Which word is a noun?", "options": ["run", "happy", "dog", "quickly"], "a": 2, "d": 1},
    {"q": "What is the plural of 'cat'?", "options": ["cat", "cats", "cates", "caties"], "a": 1, "d": 1},
    {"q": "Which word means the opposite of 'big'?", "options": ["large", "huge", "small", "tall"], "a": 2, "d": 1},
    {"q": "Pick the correctly spelled word.", "options": ["hous", "house", "howse", "hause"], "a": 1, "d": 1},
    {"q": "Which is a color word?", "options": ["jump", "blue", "loud", "fast"], "a": 1, "d": 1},
    {"q": "Which letter is a vowel?", "options": ["b", "e", "t", "m"], "a": 1, "d": 1},
    {"q": "What sound does 'ch' make in 'chair'?", "options": ["k", "sh", "ch", "j"], "a": 2, "d": 1},
    {"q": "Which word rhymes with 'cat'?", "options": ["dog", "hat", "cup", "sun"], "a": 1, "d": 1},
    # D2
    {"q": "What is the past tense of 'go'?", "options": ["goed", "gone", "went", "going"], "a": 2, "d": 2},
    {"q": "Choose the correct article: '___ apple'.", "options": ["a", "an", "the one", "some"], "a": 1, "d": 2},
    {"q": "Which sentence is correct?", "options": ["She run fast.", "She runs fast.", "She running fast.", "She runned fast."], "a": 1, "d": 2},
    {"q": "What is the past tense of 'eat'?", "options": ["eated", "ate", "eaten", "eating"], "a": 1, "d": 2},
    {"q": "Which word is a verb?", "options": ["table", "swim", "green", "slowly"], "a": 1, "d": 2},
    {"q": "Choose the correct plural: 'child'.", "options": ["childs", "childes", "children", "childies"], "a": 2, "d": 2},
    {"q": "Which word begins a question?", "options": ["The", "Because", "What", "And"], "a": 2, "d": 2},
    {"q": "Fill in: 'I ___ to school every day.'", "options": ["goes", "go", "gone", "going"], "a": 1, "d": 2},
    # D3
    {"q": "A synonym for 'happy' is:", "options": ["sad", "joyful", "angry", "tired"], "a": 1, "d": 3},
    {"q": "Choose the correct spelling.", "options": ["recieve", "receive", "receeve", "receve"], "a": 1, "d": 3},
    {"q": "Which sentence is punctuated correctly?", "options": ["its a nice day", "It's a nice day.", "Its a nice day", "it's a nice day"], "a": 1, "d": 3},
    {"q": "An antonym for 'ancient' is:", "options": ["old", "modern", "historic", "aged"], "a": 1, "d": 3},
    {"q": "Which word is an adjective?", "options": ["quickly", "brave", "run", "table"], "a": 1, "d": 3},
    {"q": "Pick the correct contraction for 'they are'.", "options": ["their", "there", "they're", "theyre"], "a": 2, "d": 3},
    {"q": "Which word is spelled correctly?", "options": ["definately", "definitely", "definitly", "definetly"], "a": 1, "d": 3},
    {"q": "What punctuation ends a question?", "options": ["period", "comma", "question mark", "colon"], "a": 2, "d": 3},
    # D4
    {"q": "Which sentence uses correct subject-verb agreement?", "options": ["The dogs barks.", "The dog bark.", "The dogs bark.", "The dog barking."], "a": 2, "d": 4},
    {"q": "Identify the adverb: 'She sang beautifully.'", "options": ["She", "sang", "beautifully", "none"], "a": 2, "d": 4},
    {"q": "Which is a complete sentence?", "options": ["Running down the street.", "Because it rained.", "The team won the game.", "After the show."], "a": 2, "d": 4},
    {"q": "Choose the correct word: 'The book is ___ the table.'", "options": ["on", "in", "at", "of"], "a": 0, "d": 4},
    {"q": "What is the comparative form of 'good'?", "options": ["gooder", "better", "best", "more good"], "a": 1, "d": 4},
    {"q": "Which word is a conjunction?", "options": ["quickly", "and", "happy", "under"], "a": 1, "d": 4},
    {"q": "Identify the pronoun: 'They went home.'", "options": ["They", "went", "home", "none"], "a": 0, "d": 4},
    {"q": "Which sentence is in future tense?", "options": ["I walked.", "I walk.", "I will walk.", "I am walking."], "a": 2, "d": 4},
    # D5
    {"q": "'The classroom was a zoo' is an example of a:", "options": ["simile", "metaphor", "hyperbole", "pun"], "a": 1, "d": 5},
    {"q": "Which word means 'to make less severe'?", "options": ["aggravate", "alleviate", "accumulate", "allocate"], "a": 1, "d": 5},
    {"q": "Identify the figurative device: 'The wind whispered.'", "options": ["personification", "alliteration", "irony", "metaphor"], "a": 0, "d": 5},
    {"q": "A synonym for 'meticulous' is:", "options": ["careless", "thorough", "quick", "loud"], "a": 1, "d": 5},
    {"q": "Which sentence is in the passive voice?", "options": ["The chef cooked the meal.", "The meal was cooked by the chef.", "The chef is cooking.", "Cook the meal."], "a": 1, "d": 5},
    {"q": "'Ubiquitous' most nearly means:", "options": ["rare", "everywhere", "hidden", "ancient"], "a": 1, "d": 5},
    {"q": "Which is an example of alliteration?", "options": ["Big blue ball", "Peter picked peppers", "The end", "A red car"], "a": 1, "d": 5},
    {"q": "'Benevolent' most nearly means:", "options": ["cruel", "kind", "wealthy", "silent"], "a": 1, "d": 5},
]

# ---------------- Overall (math / science / general) bank ----------------
OVERALL_BANK = [
    # D1
    {"q": "What is 2 + 3?", "options": ["4", "5", "6", "7"], "a": 1, "d": 1},
    {"q": "How many days are in a week?", "options": ["5", "6", "7", "8"], "a": 2, "d": 1},
    {"q": "What color do you get mixing blue and yellow?", "options": ["Green", "Purple", "Orange", "Brown"], "a": 0, "d": 1},
    {"q": "Which number is largest?", "options": ["10", "5", "8", "2"], "a": 0, "d": 1},
    {"q": "How many sides does a triangle have?", "options": ["2", "3", "4", "5"], "a": 1, "d": 1},
    {"q": "What is 10 - 4?", "options": ["5", "6", "7", "8"], "a": 1, "d": 1},
    {"q": "How many legs does a dog have?", "options": ["2", "3", "4", "6"], "a": 2, "d": 1},
    {"q": "What comes after 9?", "options": ["8", "10", "11", "7"], "a": 1, "d": 1},
    {"q": "Which shape is round?", "options": ["Square", "Triangle", "Circle", "Rectangle"], "a": 2, "d": 1},
    {"q": "What is 1 + 1?", "options": ["1", "2", "3", "4"], "a": 1, "d": 1},
    {"q": "How many months are in a year?", "options": ["10", "11", "12", "13"], "a": 2, "d": 1},
    {"q": "What do bees make?", "options": ["Milk", "Honey", "Bread", "Silk"], "a": 1, "d": 1},
    # D2
    {"q": "What is 7 x 8?", "options": ["54", "56", "64", "48"], "a": 1, "d": 2},
    {"q": "Which planet is closest to the Sun?", "options": ["Venus", "Earth", "Mercury", "Mars"], "a": 2, "d": 2},
    {"q": "How many legs does an insect have?", "options": ["4", "6", "8", "10"], "a": 1, "d": 2},
    {"q": "What is 45 divided by 9?", "options": ["4", "5", "6", "7"], "a": 1, "d": 2},
    {"q": "What gas do plants take in from the air?", "options": ["Oxygen", "Carbon dioxide", "Nitrogen", "Helium"], "a": 1, "d": 2},
    {"q": "What is the capital of the United States?", "options": ["New York", "Los Angeles", "Washington, D.C.", "Chicago"], "a": 2, "d": 2},
    {"q": "What is 12 + 19?", "options": ["29", "31", "32", "30"], "a": 1, "d": 2},
    {"q": "How many hours are in a day?", "options": ["12", "24", "36", "48"], "a": 1, "d": 2},
    {"q": "Which animal is a reptile?", "options": ["Frog", "Snake", "Dolphin", "Sparrow"], "a": 1, "d": 2},
    {"q": "What is 100 - 37?", "options": ["63", "73", "67", "53"], "a": 0, "d": 2},
    {"q": "Water is made of hydrogen and what?", "options": ["Carbon", "Oxygen", "Nitrogen", "Sodium"], "a": 1, "d": 2},
    {"q": "Which is the smallest?", "options": ["0.5", "0.25", "0.75", "1"], "a": 1, "d": 2},
    # D3
    {"q": "What is 3/4 as a decimal?", "options": ["0.34", "0.75", "0.43", "0.7"], "a": 1, "d": 3},
    {"q": "Water freezes at what temperature (°C)?", "options": ["0", "32", "100", "-10"], "a": 0, "d": 3},
    {"q": "What is the capital of France?", "options": ["Rome", "Madrid", "Paris", "Berlin"], "a": 2, "d": 3},
    {"q": "What is 15% of 200?", "options": ["20", "30", "25", "35"], "a": 1, "d": 3},
    {"q": "Which is a mammal?", "options": ["Shark", "Whale", "Salmon", "Octopus"], "a": 1, "d": 3},
    {"q": "How many continents are there?", "options": ["5", "6", "7", "8"], "a": 2, "d": 3},
    {"q": "What is 9 squared?", "options": ["18", "81", "72", "99"], "a": 1, "d": 3},
    {"q": "Which ocean is the largest?", "options": ["Atlantic", "Indian", "Pacific", "Arctic"], "a": 2, "d": 3},
    {"q": "What is the freezing point of water in °F?", "options": ["0", "32", "100", "212"], "a": 1, "d": 3},
    {"q": "A right angle measures how many degrees?", "options": ["45", "90", "180", "360"], "a": 1, "d": 3},
    {"q": "What is 7 x 12?", "options": ["72", "84", "96", "78"], "a": 1, "d": 3},
    {"q": "Which planet is known as the Red Planet?", "options": ["Venus", "Jupiter", "Mars", "Saturn"], "a": 2, "d": 3},
    # D4
    {"q": "Solve for x: 2x + 6 = 14.", "options": ["3", "4", "5", "6"], "a": 1, "d": 4},
    {"q": "Who wrote 'Romeo and Juliet'?", "options": ["Dickens", "Shakespeare", "Twain", "Poe"], "a": 1, "d": 4},
    {"q": "What is the area of a rectangle 5 by 8?", "options": ["13", "40", "26", "35"], "a": 1, "d": 4},
    {"q": "What is the powerhouse of the cell?", "options": ["Nucleus", "Ribosome", "Mitochondria", "Membrane"], "a": 2, "d": 4},
    {"q": "The square root of 144 is:", "options": ["11", "12", "13", "14"], "a": 1, "d": 4},
    {"q": "In which year did World War II end?", "options": ["1918", "1939", "1945", "1950"], "a": 2, "d": 4},
    {"q": "What is 3/5 + 1/5?", "options": ["4/10", "4/5", "2/5", "1"], "a": 1, "d": 4},
    {"q": "Which is a prime number?", "options": ["9", "15", "17", "21"], "a": 2, "d": 4},
    {"q": "What force pulls objects toward Earth?", "options": ["Friction", "Gravity", "Magnetism", "Tension"], "a": 1, "d": 4},
    {"q": "The perimeter of a square with side 6 is:", "options": ["12", "24", "36", "18"], "a": 1, "d": 4},
    {"q": "Which country is home to the Great Pyramid?", "options": ["Greece", "Egypt", "Mexico", "Iraq"], "a": 1, "d": 4},
    {"q": "What is 20% of 250?", "options": ["40", "50", "45", "60"], "a": 1, "d": 4},
    # D5
    {"q": "What is the value of 2³ + 3²?", "options": ["17", "15", "13", "19"], "a": 0, "d": 5},
    {"q": "Which element has the chemical symbol 'Na'?", "options": ["Nitrogen", "Sodium", "Nickel", "Neon"], "a": 1, "d": 5},
    {"q": "Simplify: 3(2x - 4) + 5.", "options": ["6x - 7", "6x - 12", "6x + 1", "6x - 17"], "a": 0, "d": 5},
    {"q": "What is the speed of light (approx)?", "options": ["300 km/s", "300,000 km/s", "3,000 km/s", "30 km/s"], "a": 1, "d": 5},
    {"q": "If a triangle has angles 40° and 65°, the third is:", "options": ["65°", "75°", "85°", "95°"], "a": 1, "d": 5},
    {"q": "Who developed the theory of relativity?", "options": ["Newton", "Einstein", "Galileo", "Darwin"], "a": 1, "d": 5},
    {"q": "What is the derivative of x²?", "options": ["x", "2x", "x³", "2"], "a": 1, "d": 5},
    {"q": "Which gas makes up most of Earth's atmosphere?", "options": ["Oxygen", "Carbon dioxide", "Nitrogen", "Argon"], "a": 2, "d": 5},
    {"q": "Solve: log₁₀(1000) = ?", "options": ["2", "3", "10", "100"], "a": 1, "d": 5},
    {"q": "The Pythagorean theorem relates the sides of a:", "options": ["circle", "right triangle", "square", "pentagon"], "a": 1, "d": 5},
    {"q": "What is 7! (7 factorial)?", "options": ["720", "5040", "343", "49"], "a": 1, "d": 5},
    {"q": "Which economist wrote 'The Wealth of Nations'?", "options": ["Keynes", "Adam Smith", "Marx", "Ricardo"], "a": 1, "d": 5},
]

# ---------------- Career interest survey (Likert, not adaptive) ----------------
CAREER_LIKERT = ["Strongly disagree", "Disagree", "Agree", "Strongly agree"]
CAREER_QUESTIONS = [
    {"q": "I enjoy solving math puzzles.", "interest": "STEM & Math"},
    {"q": "I enjoy experiments and figuring out why things happen.", "interest": "STEM & Math"},
    {"q": "I enjoy working with numbers and data.", "interest": "STEM & Math"},
    {"q": "I want to discover new scientific ideas.", "interest": "STEM & Math"},
    {"q": "I like measuring and analyzing results.", "interest": "STEM & Math"},
    {"q": "I like writing stories or essays.", "interest": "Writing & Humanities"},
    {"q": "I like reading books and discussing ideas.", "interest": "Writing & Humanities"},
    {"q": "I like learning about history and different cultures.", "interest": "Writing & Humanities"},
    {"q": "I enjoy debates and persuading others with words.", "interest": "Writing & Humanities"},
    {"q": "I enjoy learning new languages.", "interest": "Writing & Humanities"},
    {"q": "I am curious about how machines and gadgets work.", "interest": "Engineering & Tech"},
    {"q": "I enjoy building or fixing things with my hands.", "interest": "Engineering & Tech"},
    {"q": "I enjoy coding or working with computers.", "interest": "Engineering & Tech"},
    {"q": "I like designing how things should be built.", "interest": "Engineering & Tech"},
    {"q": "I like taking things apart to see how they work.", "interest": "Engineering & Tech"},
    {"q": "I enjoy helping and teaching others.", "interest": "Education & Care"},
    {"q": "I feel good when I care for people or animals.", "interest": "Education & Care"},
    {"q": "I like explaining things so others understand.", "interest": "Education & Care"},
    {"q": "I want a job where I help my community.", "interest": "Education & Care"},
    {"q": "I am patient when someone is learning something new.", "interest": "Education & Care"},
    {"q": "I love drawing, music, or design.", "interest": "Arts & Design"},
    {"q": "I like expressing myself creatively.", "interest": "Arts & Design"},
    {"q": "I enjoy photography, film, or visual art.", "interest": "Arts & Design"},
    {"q": "I like making things look beautiful.", "interest": "Arts & Design"},
    {"q": "I enjoy performing or creating on a stage.", "interest": "Arts & Design"},
    {"q": "I like organizing projects and leading a team.", "interest": "Business & Leadership"},
    {"q": "I am interested in how money and businesses work.", "interest": "Business & Leadership"},
    {"q": "I like setting goals and making plans to reach them.", "interest": "Business & Leadership"},
    {"q": "I enjoy convincing people to support my ideas.", "interest": "Business & Leadership"},
    {"q": "I would like to start my own company someday.", "interest": "Business & Leadership"},
]

BANKS = {"english": ENGLISH_BANK, "overall": OVERALL_BANK}

# Questions served per test
TEST_LENGTHS = {"english": 30, "overall": 50, "career": 30}

TITLES = {"english": "English Assessment", "overall": "Overall Assessment", "career": "Career Interests"}

# Scoring scale: 50 = Kindergarten, 1000 = 12th grade, up to 1200 = college level
SCORE_MIN = 50
SCORE_GRADE12 = 1000
SCORE_MAX = 1200


def grade_to_difficulty(grade_int):
    """Map a self-declared grade (K=0 .. 12) to a starting difficulty band (1-5)."""
    if grade_int <= 2:
        return 1
    if grade_int <= 4:
        return 2
    if grade_int <= 6:
        return 3
    if grade_int <= 9:
        return 4
    return 5


def score_to_level_label(score):
    if score > SCORE_GRADE12:
        return "College level"
    grade = max(0, min(12, round((score - SCORE_MIN) / (SCORE_GRADE12 - SCORE_MIN) * 12)))
    return "Kindergarten level" if grade == 0 else f"Grade {grade} level"


def score_to_grade(score):
    if score > SCORE_GRADE12:
        return 12
    return max(0, min(12, round((score - SCORE_MIN) / (SCORE_GRADE12 - SCORE_MIN) * 12)))
