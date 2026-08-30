from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import json
import uuid
import secrets
import random
import logging
import re
from datetime import datetime, timezone, timedelta
from typing import Optional, List

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

from curriculum_data import SUBJECTS, SUBJECT_MAP, get_chapter, US_STATES
from assessment_data import BANKS, CAREER_QUESTIONS, CAREER_LIKERT, TEST_LENGTHS, TITLES

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("studybridge")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")
FRONTEND_URL = os.environ.get("REACT_APP_BACKEND_URL", "")

CHAT_MODEL = ("gemini", "gemini-3-flash-preview")
LESSON_MODEL = ("gemini", "gemini-3.1-pro-preview")

app = FastAPI()
api = APIRouter(prefix="/api")


# ---------------- helpers ----------------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def clean(doc: dict) -> dict:
    if not doc:
        return doc
    doc = dict(doc)
    doc.pop("_id", None)
    doc.pop("password_hash", None)
    return doc


async def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth[7:]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


import asyncio

_llm_lock = asyncio.Lock()


async def llm_send(chat, user_message, retries: int = 4):
    """Send an LLM message. Serialized + retried to respect the shared-key concurrency limit."""
    async with _llm_lock:
        delay = 1.5
        for attempt in range(retries):
            try:
                return await chat.send_message(user_message)
            except Exception as e:
                msg = str(e).lower()
                transient = "429" in msg or "rate" in msg or "concurren" in msg
                if transient and attempt < retries - 1:
                    await asyncio.sleep(delay)
                    delay *= 2
                    continue
                raise


def grade_to_int(grade: str) -> int:
    if grade in ("K", "k"):
        return 0
    try:
        return int(grade)
    except (ValueError, TypeError):
        return 0


# ---------------- models ----------------
class StudentRegister(BaseModel):
    username: str
    email: EmailStr
    password: str
    grade: str
    school: Optional[str] = ""
    state: Optional[str] = ""
    district: Optional[str] = ""
    principal_email: Optional[str] = ""
    district_email: Optional[str] = ""
    library_email: Optional[str] = ""
    homeschool: bool = False


class ParentRegister(BaseModel):
    parent_name: str
    email: EmailStr
    password: str
    child_username: str
    child_grade: str
    school: Optional[str] = ""
    state: Optional[str] = ""
    district: Optional[str] = ""
    homeschool: bool = False


class LoginBody(BaseModel):
    email: EmailStr
    password: str


class ForgotBody(BaseModel):
    email: EmailStr


class ResetBody(BaseModel):
    token: str
    password: str


class ChatBody(BaseModel):
    message: str
    session_id: str
    image_base64: Optional[str] = None
    subject: Optional[str] = None


class AssessmentSubmit(BaseModel):
    test_type: str  # english | overall | career
    answers: List[int]


class ParentalControls(BaseModel):
    prohibit_chat: bool = False
    hide_real_name: bool = False
    restrict_usernames: bool = False
    disable_contests: bool = True


class FeedbackBody(BaseModel):
    rating: int
    comment: Optional[str] = ""


# ---------------- auth ----------------
@api.post("/auth/register-student")
async def register_student(body: StudentRegister):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    grade_int = grade_to_int(body.grade)
    if grade_int < 6 and not body.homeschool:
        raise HTTPException(
            status_code=400,
            detail="Students in grades K-5 must be registered by a parent.",
        )
    user_id = str(uuid.uuid4())
    needs_assessment = grade_int >= 5
    user = {
        "id": user_id,
        "role": "student",
        "username": body.username,
        "email": email,
        "password_hash": hash_password(body.password),
        "grade": body.grade,
        "grade_int": grade_int,
        "school": body.school,
        "state": body.state,
        "district": body.district,
        "cert_emails": {
            "principal": body.principal_email,
            "district": body.district_email,
            "library": body.library_email,
        },
        "homeschool": body.homeschool,
        "account_type": "self",
        "consent_verified": True,
        "onboarding_complete": not needs_assessment,
        "needs_assessment": needs_assessment,
        "assessments": {},
        "curriculum_weights": {},
        "parental_controls": ParentalControls().model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user)
    token = create_token(user_id, email)
    return {"token": token, "user": clean(user)}


@api.post("/auth/register-parent")
async def register_parent(body: ParentRegister):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    grade_int = grade_to_int(body.child_grade)
    user_id = str(uuid.uuid4())
    consent_token = secrets.token_urlsafe(24)
    needs_assessment = grade_int >= 5
    user = {
        "id": user_id,
        "role": "student",
        "username": body.child_username,
        "email": email,  # parent email; no child email stored
        "password_hash": hash_password(body.password),
        "grade": body.child_grade,
        "grade_int": grade_int,
        "school": body.school,
        "state": body.state,
        "district": body.district,
        "cert_emails": {},
        "homeschool": body.homeschool,
        "account_type": "parent_led",
        "parent_name": body.parent_name,
        "consent_verified": False,
        "consent_token": consent_token,
        "onboarding_complete": not needs_assessment,
        "needs_assessment": needs_assessment,
        "assessments": {},
        "curriculum_weights": {},
        "parental_controls": ParentalControls(
            prohibit_chat=True, disable_contests=True
        ).model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user)
    consent_link = f"{FRONTEND_URL}/consent?token={consent_token}"
    logger.info(f"[MOCK EMAIL] Parental consent link for {email}: {consent_link}")
    token = create_token(user_id, email)
    return {
        "token": token,
        "user": clean(user),
        "consent_link": consent_link,  # surfaced in-app (mock email)
    }


@api.get("/parent/consent/verify")
async def verify_consent(token: str):
    user = await db.users.find_one({"consent_token": token})
    if not user:
        raise HTTPException(status_code=404, detail="Invalid or expired consent link")
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"consent_verified": True}, "$unset": {"consent_token": ""}},
    )
    return {"success": True, "username": user["username"]}


@api.post("/auth/login")
async def login(body: LoginBody):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(user["id"], email)
    return {"token": token, "user": clean(user)}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return clean(user)


@api.post("/auth/logout")
async def logout(user: dict = Depends(get_current_user)):
    return {"success": True}


@api.post("/auth/forgot-password")
async def forgot(body: ForgotBody):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if user:
        reset_token = secrets.token_urlsafe(32)
        await db.password_resets.insert_one({
            "token": reset_token,
            "user_id": user["id"],
            "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
            "used": False,
        })
        link = f"{FRONTEND_URL}/reset-password?token={reset_token}"
        logger.info(f"[MOCK EMAIL] Password reset link for {email}: {link}")
        return {"success": True, "reset_link": link}
    return {"success": True, "reset_link": None}


@api.post("/auth/reset-password")
async def reset(body: ResetBody):
    rec = await db.password_resets.find_one({"token": body.token, "used": False})
    if not rec or rec["expires_at"] < datetime.now(timezone.utc).isoformat():
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    await db.users.update_one(
        {"id": rec["user_id"]},
        {"$set": {"password_hash": hash_password(body.password)}},
    )
    await db.password_resets.update_one({"token": body.token}, {"$set": {"used": True}})
    return {"success": True}


# ---------------- stats ----------------
@api.get("/stats")
async def stats():
    count = await db.users.count_documents({"role": "student"})
    UNLOCK = 10000
    return {
        "registered_users": count,
        "unlock_threshold": UNLOCK,
        "features_unlocked": count >= UNLOCK,
        "progress_pct": round(min(count / UNLOCK * 100, 100), 2),
    }


# ---------------- curriculum ----------------
@api.get("/subjects")
async def subjects(user: dict = Depends(get_current_user)):
    return {"subjects": SUBJECTS}


@api.get("/subjects/{subject_key}")
async def subject_detail(subject_key: str, user: dict = Depends(get_current_user)):
    subject = SUBJECT_MAP.get(subject_key)
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    progress = await db.progress.find(
        {"user_id": user["id"], "subject": subject_key}
    ).to_list(100)
    prog_map = {p["chapter"]: p for p in progress}
    chapters = []
    for ch in subject["chapters"]:
        p = prog_map.get(ch["key"], {})
        chapters.append({**ch, "best_score": p.get("best_score", 0),
                         "completed": p.get("completed", False),
                         "state": p.get("state", "new")})
    return {"subject": subject, "chapters": chapters}


async def generate_chapter_content(subject, chapter, grade_int):
    grade_label = "Kindergarten" if grade_int == 0 else f"Grade {grade_int}"
    is_science = subject["key"] == "science"
    lab_schema = """,
  "lab": {"title": "short lab name", "objective": "what students will discover", "materials": ["item"], "steps": ["step 1", "step 2"], "safety": "one safety note", "prediction": {"question": "what do you predict?", "options": ["a","b","c","d"], "answer_index": 0, "result": "explain what actually happens and why"}}""" if is_science else ""
    lab_instruction = " Also include exactly ONE hands-on virtual 'lab' with 4-6 steps and a prediction question (4 options)." if is_science else ""
    prompt = f"""Create educational content for a {grade_label} chapter titled "{chapter['title']}" in {subject['name']}.
Return STRICT JSON only, no markdown fences, with this exact shape:
{{
  "lessons": [
    {{"title": "short title", "body": "2-3 short paragraphs of kid-friendly explanation"}}
  ],
  "exercises": [
    {{"question": "text", "options": ["a","b","c","d"], "answer_index": 0, "explanation": "why"}}
  ],
  "glossary": [{{"term": "word", "definition": "kid-friendly definition"}}],
  "videos": [
    {{"title": "clear video title", "description": "one sentence on what it teaches", "duration": "e.g. 5 min", "query": "a safe youtube search phrase for this topic"}}
  ]{lab_schema}
}}
Provide exactly 4 lessons, 5 exercises (multiple choice, 4 options each), 5 glossary terms, and 12 kid-safe educational videos (each 'query' must be a specific, safe search phrase suited to {grade_label}).{lab_instruction} Keep language appropriate for {grade_label}."""
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"lesson-{uuid.uuid4()}",
        system_message="You are an expert K-12 curriculum author. Output valid JSON only.",
    ).with_model(*LESSON_MODEL)
    resp = await llm_send(chat, UserMessage(text=prompt))
    text = resp.strip()
    text = re.sub(r"^```(json)?", "", text).strip()
    text = re.sub(r"```$", "", text).strip()
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        text = match.group(0)
    data = json.loads(text)
    data.setdefault("videos", [])
    if not is_science:
        data["lab"] = None
    return data


@api.get("/subjects/{subject_key}/chapters/{chapter_key}")
async def chapter_detail(
    subject_key: str, chapter_key: str, user: dict = Depends(get_current_user)
):
    subject, chapter = get_chapter(subject_key, chapter_key)
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    grade_int = user.get("grade_int", 0)
    cache_key = f"{subject_key}:{chapter_key}:{grade_int}:v2"
    cached = await db.chapter_content.find_one({"cache_key": cache_key})
    if cached:
        content = cached["content"]
    else:
        try:
            content = await generate_chapter_content(subject, chapter, grade_int)
        except Exception as e:
            logger.error(f"Lesson generation failed: {e}")
            raise HTTPException(status_code=502, detail="Could not generate lesson content. Please try again.")
        await db.chapter_content.insert_one({
            "cache_key": cache_key,
            "subject": subject_key,
            "chapter": chapter_key,
            "grade_int": grade_int,
            "content": content,
            "published": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    prog = await db.progress.find_one(
        {"user_id": user["id"], "subject": subject_key, "chapter": chapter_key}
    )
    return {
        "subject": subject,
        "chapter": chapter,
        "content": content,
        "progress": clean(prog) if prog else None,
    }


class ExerciseSubmit(BaseModel):
    subject: str
    chapter: str
    answers: List[int]


@api.post("/exercises/submit")
async def submit_exercise(body: ExerciseSubmit, user: dict = Depends(get_current_user)):
    grade_int = user.get("grade_int", 0)
    cache_key = f"{body.subject}:{body.chapter}:{grade_int}:v2"
    cached = await db.chapter_content.find_one({"cache_key": cache_key})
    if not cached:
        raise HTTPException(status_code=404, detail="Chapter content not found")
    exercises = cached["content"]["exercises"]
    correct = sum(
        1 for i, ex in enumerate(exercises)
        if i < len(body.answers) and body.answers[i] == ex["answer_index"]
    )
    total = len(exercises)
    score = round(correct / total * 100) if total else 0
    if score == 100:
        state = "mastery"
    elif score >= 80:
        state = "pass"
    else:
        state = "in-progress"
    existing = await db.progress.find_one(
        {"user_id": user["id"], "subject": body.subject, "chapter": body.chapter}
    )
    best = max(score, existing["best_score"]) if existing else score
    doc = {
        "user_id": user["id"],
        "subject": body.subject,
        "chapter": body.chapter,
        "best_score": best,
        "last_score": score,
        "state": "mastery" if best == 100 else ("pass" if best >= 80 else "in-progress"),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.progress.update_one(
        {"user_id": user["id"], "subject": body.subject, "chapter": body.chapter},
        {"$set": doc}, upsert=True,
    )
    return {"score": score, "correct": correct, "total": total, "state": state, "best_score": best}


class WatchedBody(BaseModel):
    subject: str
    chapter: str
    video_index: int


@api.post("/videos/watched")
async def mark_watched(body: WatchedBody, user: dict = Depends(get_current_user)):
    await db.progress.update_one(
        {"user_id": user["id"], "subject": body.subject, "chapter": body.chapter},
        {
            "$addToSet": {"watched_videos": body.video_index},
            "$setOnInsert": {"best_score": 0, "last_score": 0, "state": "in-progress"},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()},
        },
        upsert=True,
    )
    prog = await db.progress.find_one(
        {"user_id": user["id"], "subject": body.subject, "chapter": body.chapter}
    )
    return {"watched_videos": sorted(prog.get("watched_videos", []))}


class ChapterRef(BaseModel):
    subject: str
    chapter: str


@api.post("/labs/complete")
async def complete_lab(body: ChapterRef, user: dict = Depends(get_current_user)):
    await db.progress.update_one(
        {"user_id": user["id"], "subject": body.subject, "chapter": body.chapter},
        {"$set": {"lab_done": True, "updated_at": datetime.now(timezone.utc).isoformat()},
         "$setOnInsert": {"best_score": 0, "last_score": 0, "state": "in-progress"}},
        upsert=True,
    )
    return {"lab_done": True}


@api.post("/chapters/complete")
async def complete_chapter(body: ChapterRef, user: dict = Depends(get_current_user)):
    await db.progress.update_one(
        {"user_id": user["id"], "subject": body.subject, "chapter": body.chapter},
        {"$set": {"completed": True, "completed_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"completed": True}


# ---------------- assessments (adaptive) ----------------
def _finalize_result(test_type, responses):
    """responses: list of {d, correct} for scored tests, or {answer, interest} for career."""
    if test_type == "career":
        tally = {}
        for r in responses:
            tally[r["interest"]] = tally.get(r["interest"], 0) + r["answer"]
        ranked = sorted(tally.items(), key=lambda x: x[1], reverse=True)
        return {"top_interests": [name for name, _ in ranked[:3]], "total": len(responses)}
    earned = sum(r["d"] for r in responses if r["correct"])
    possible = sum(r["d"] for r in responses) or 1
    correct = sum(1 for r in responses if r["correct"])
    total = len(responses)
    ratio = earned / possible
    if test_type == "overall":
        scaled = round(100 + ratio * 900)
        mapped_grade = max(0, min(12, round(ratio * 12)))
        return {"scaled_score": scaled, "mapped_grade": mapped_grade, "correct": correct, "total": total}
    level = "Advanced" if ratio >= 0.75 else "Proficient" if ratio >= 0.5 else "Developing"
    return {"level": level, "correct": correct, "total": total,
            "suggested_books": ["Charlotte's Web", "Wonder", "Holes", "Matilda", "Hatchet"]}


async def _apply_assessment_result(user, test_type, result):
    assessments = user.get("assessments", {})
    assessments[test_type] = {"result": result, "completed_at": datetime.now(timezone.utc).isoformat()}
    update = {"assessments": assessments}
    required = {"english", "overall"}
    if user.get("grade_int", 0) >= 6:
        required.add("career")
    onboarding_complete = required.issubset(set(assessments.keys()))
    if onboarding_complete:
        update["onboarding_complete"] = True
        update["needs_assessment"] = False
        overall = assessments.get("overall", {}).get("result", {})
        weights = {"math": 1.0, "english": 1.0, "science": 1.0, "social": 1.0}
        if overall.get("scaled_score", 1000) < 500:
            weights["math"] = 1.5
            weights["english"] = 1.5
        update["curriculum_weights"] = weights
    await db.users.update_one({"id": user["id"]}, {"$set": update})
    return onboarding_complete


def _pick_question(test_type, difficulty, asked_indexes):
    """Adaptive: choose an unused question at the target difficulty, else the nearest available."""
    bank = BANKS[test_type]
    available = [i for i in range(len(bank)) if i not in asked_indexes]
    if not available:
        return None
    available.sort(key=lambda i: abs(bank[i]["d"] - difficulty))
    best_dist = abs(bank[available[0]]["d"] - difficulty)
    candidates = [i for i in available if abs(bank[i]["d"] - difficulty) == best_dist]
    return random.choice(candidates)


def _public_question(test_type, idx, number, total, difficulty):
    if test_type == "career":
        q = CAREER_QUESTIONS[idx]
        return {"q": q["q"], "options": CAREER_LIKERT, "number": number, "total": total, "difficulty": None}
    q = BANKS[test_type][idx]
    return {"q": q["q"], "options": q["options"], "number": number, "total": total, "difficulty": difficulty}


@api.post("/assessments/start")
async def start_assessment(body: dict, user: dict = Depends(get_current_user)):
    test_type = body.get("test_type")
    if test_type not in TEST_LENGTHS:
        raise HTTPException(status_code=404, detail="Assessment not found")
    if test_type == "career" and user.get("grade_int", 0) < 6:
        raise HTTPException(status_code=403, detail="Career test is for grade 6 and up.")
    total = TEST_LENGTHS[test_type]
    session_id = str(uuid.uuid4())
    if test_type == "career":
        first_idx, difficulty = 0, None
    else:
        difficulty = 3
        first_idx = _pick_question(test_type, difficulty, [])
    session = {
        "id": session_id, "user_id": user["id"], "test_type": test_type,
        "total": total, "difficulty": difficulty, "asked": [first_idx],
        "responses": [], "current_idx": first_idx, "completed": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.assessment_sessions.insert_one(session)
    return {
        "session_id": session_id, "test_type": test_type, "title": TITLES[test_type],
        "adaptive": test_type != "career",
        "question": _public_question(test_type, first_idx, 1, total, difficulty),
    }


@api.post("/assessments/answer")
async def answer_assessment(body: dict, user: dict = Depends(get_current_user)):
    session_id = body.get("session_id")
    answer_index = body.get("answer_index")
    session = await db.assessment_sessions.find_one({"id": session_id, "user_id": user["id"]})
    if not session:
        raise HTTPException(status_code=404, detail="Assessment session not found")
    if session["completed"]:
        raise HTTPException(status_code=400, detail="Assessment already completed")
    test_type = session["test_type"]
    cur_idx = session["current_idx"]
    responses = session["responses"]
    difficulty = session.get("difficulty") or 3

    if test_type == "career":
        q = CAREER_QUESTIONS[cur_idx]
        responses.append({"answer": int(answer_index), "interest": q["interest"]})
    else:
        q = BANKS[test_type][cur_idx]
        correct = int(answer_index) == q["a"]
        responses.append({"d": q["d"], "correct": correct})
        difficulty = min(5, difficulty + 1) if correct else max(1, difficulty - 1)

    # Finished?
    if len(responses) >= session["total"]:
        result = _finalize_result(test_type, responses)
        onboarding_complete = await _apply_assessment_result(user, test_type, result)
        await db.assessment_sessions.update_one(
            {"id": session_id}, {"$set": {"completed": True, "responses": responses, "result": result}}
        )
        return {"done": True, "result": result, "onboarding_complete": onboarding_complete}

    # Next question
    if test_type == "career":
        next_idx = len(responses)  # sequential
    else:
        next_idx = _pick_question(test_type, difficulty, session["asked"])
        if next_idx is None:  # bank exhausted early
            result = _finalize_result(test_type, responses)
            onboarding_complete = await _apply_assessment_result(user, test_type, result)
            await db.assessment_sessions.update_one(
                {"id": session_id}, {"$set": {"completed": True, "responses": responses, "result": result}}
            )
            return {"done": True, "result": result, "onboarding_complete": onboarding_complete}

    await db.assessment_sessions.update_one(
        {"id": session_id},
        {"$set": {"difficulty": difficulty, "current_idx": next_idx, "responses": responses},
         "$push": {"asked": next_idx}},
    )
    number = len(responses) + 1
    return {"done": False, "question": _public_question(test_type, next_idx, number, session["total"], difficulty)}


# ---------------- AI helper ----------------
AI_HELPER_PROMPT = """You are StudyBridge Buddy, a kind, patient K-12 study helper.
CRITICAL RULES:
- You DISCUSS, you do NOT simply give final answers. Guide the student to think.
- Ask guiding questions. Give hints and break problems into steps.
- Only after the student has genuinely tried across a few turns should you confirm a final answer.
- Be encouraging, safe, and age-appropriate. Never discuss unsafe or adult topics.
- Keep replies short and warm."""


@api.post("/ai/helper")
async def ai_helper(body: ChatBody, user: dict = Depends(get_current_user)):
    if user.get("parental_controls", {}).get("prohibit_chat") and user.get("account_type") == "parent_led":
        # AI helper is allowed even for K-5 (it's the tutor CHAT that's blocked). Keep helper on.
        pass
    session_id = f"helper-{user['id']}-{body.session_id}"
    await db.chat_messages.insert_one({
        "user_id": user["id"], "session_id": session_id, "role": "user",
        "text": body.message, "created_at": datetime.now(timezone.utc).isoformat(),
    })
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY, session_id=session_id, system_message=AI_HELPER_PROMPT
    ).with_model(*CHAT_MODEL)
    msg_kwargs = {"text": body.message or "Please look at my question in the image."}
    if body.image_base64:
        b64 = body.image_base64.split(",")[-1]
        msg_kwargs["file_contents"] = [ImageContent(image_base64=b64)]
    try:
        reply = await llm_send(chat, UserMessage(**msg_kwargs))
    except Exception as e:
        logger.error(f"AI helper failed: {e}")
        raise HTTPException(status_code=502, detail="The helper is unavailable right now. Please try again.")
    await db.chat_messages.insert_one({
        "user_id": user["id"], "session_id": session_id, "role": "assistant",
        "text": reply, "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"reply": reply}


@api.get("/ai/history/{session_id}")
async def ai_history(session_id: str, user: dict = Depends(get_current_user)):
    sid = f"helper-{user['id']}-{session_id}"
    msgs = await db.chat_messages.find({"user_id": user["id"], "session_id": sid}).sort("created_at", 1).to_list(200)
    return {"messages": [clean(m) for m in msgs]}


# ---------------- parental controls & feedback ----------------
@api.put("/parental-controls")
async def update_controls(body: ParentalControls, user: dict = Depends(get_current_user)):
    await db.users.update_one({"id": user["id"]}, {"$set": {"parental_controls": body.model_dump()}})
    return {"success": True, "parental_controls": body.model_dump()}


@api.get("/feedback/eligible")
async def feedback_eligible(user: dict = Depends(get_current_user)):
    last = await db.feedback.find_one({"user_id": user["id"]}, sort=[("created_at", -1)])
    if not last:
        return {"eligible": True}
    last_dt = datetime.fromisoformat(last["created_at"])
    eligible = datetime.now(timezone.utc) - last_dt > timedelta(days=182)
    return {"eligible": eligible, "next_eligible": (last_dt + timedelta(days=182)).isoformat()}


@api.post("/feedback")
async def submit_feedback(body: FeedbackBody, user: dict = Depends(get_current_user)):
    await db.feedback.insert_one({
        "user_id": user["id"], "rating": body.rating, "comment": body.comment,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"success": True}


@api.get("/meta/states")
async def meta_states():
    return {"states": US_STATES}


@api.get("/career/retake-status")
async def career_retake_status(user: dict = Depends(get_current_user)):
    if user.get("grade_int", 0) < 6:
        return {"applicable": False, "due": False}
    career = (user.get("assessments") or {}).get("career")
    if not career or not career.get("completed_at"):
        return {"applicable": True, "due": False, "taken": False}
    last = datetime.fromisoformat(career["completed_at"])
    if last.tzinfo is None:
        last = last.replace(tzinfo=timezone.utc)
    next_due = last + timedelta(days=730)
    now = datetime.now(timezone.utc)
    return {
        "applicable": True,
        "taken": True,
        "due": now >= next_due,
        "last_taken": career["completed_at"],
        "next_due": next_due.isoformat(),
    }


@api.get("/")
async def root():
    return {"message": "StudyBridge API"}


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id")
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@studybridge.org")
    admin_pw = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "role": "admin", "username": "admin",
            "email": admin_email, "password_hash": hash_password(admin_pw),
            "grade": "12", "grade_int": 12, "onboarding_complete": True,
            "needs_assessment": False, "assessments": {}, "curriculum_weights": {},
            "parental_controls": ParentalControls().model_dump(),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info("Seeded admin user")
    elif not verify_password(admin_pw, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_pw)}})


@app.on_event("shutdown")
async def shutdown():
    client.close()
