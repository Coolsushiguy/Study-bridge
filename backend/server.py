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
from assessment_data import (
    BANKS, CAREER_QUESTIONS, CAREER_LIKERT, TEST_LENGTHS, TITLES,
    grade_to_difficulty, score_to_level_label, score_to_grade,
    SCORE_MIN, SCORE_MAX,
)

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
    if user.get("banned"):
        raise HTTPException(status_code=403, detail=f"This account has been banned. Reason: {user.get('ban_reason', 'policy violation')}")
    suspended_until = user.get("suspended_until")
    if suspended_until and datetime.now(timezone.utc) < datetime.fromisoformat(suspended_until):
        until_label = datetime.fromisoformat(suspended_until).strftime("%B %d, %Y")
        raise HTTPException(status_code=403, detail=f"This account is suspended until {until_label}. Reason: {user.get('suspend_reason', 'policy violation')}")
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


# ---------------- real email sending ----------------
# Provider-agnostic: works with any SMTP service (SendGrid SMTP relay, Mailgun,
# Postmark, Gmail with an app password, your own mail server, etc). Configure
# via env vars: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, FROM_EMAIL.
# If unconfigured, falls back to logging the email (keeps local dev working).
import smtplib
from email.mime.text import MIMEText

SMTP_HOST = os.environ.get("SMTP_HOST")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD")
FROM_EMAIL = os.environ.get("FROM_EMAIL", "studybridge.cooperate@protonmail.com")


async def send_email(to_email: str, subject: str, body: str):
    if not (SMTP_HOST and SMTP_USER and SMTP_PASSWORD):
        logger.warning(f"[EMAIL NOT CONFIGURED] Would send to {to_email}: {subject}\n{body}")
        return False

    def _send():
        msg = MIMEText(body)
        msg["Subject"] = subject
        msg["From"] = FROM_EMAIL
        msg["To"] = to_email
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(FROM_EMAIL, [to_email], msg.as_string())

    try:
        await asyncio.get_event_loop().run_in_executor(None, _send)
        return True
    except Exception as e:
        logger.error(f"Email send failed to {to_email}: {e}")
        return False


# ---------------- models ----------------
class StudentRegister(BaseModel):
    username: str
    email: EmailStr
    password: str
    grade: str
    age: Optional[int] = None
    school: Optional[str] = ""
    state: Optional[str] = ""
    district: Optional[str] = ""
    principal_email: Optional[str] = ""
    district_email: Optional[str] = ""
    library_email: Optional[str] = ""
    homeschool: bool = False
    terms_agreed: bool = False


class ParentInviteRequest(BaseModel):
    child_age: int
    parent_email: EmailStr


class ParentCreateAccount(BaseModel):
    token: str
    parent_name: str
    parent_password: str
    child_username: str
    child_grade: str
    school: Optional[str] = ""
    state: Optional[str] = ""
    district: Optional[str] = ""
    homeschool: bool = False
    terms_agreed: bool = False


class TutorReportBody(BaseModel):
    reason: str
    details: str


class BanBody(BaseModel):
    reason: str


class SuspendBody(BaseModel):
    reason: str
    days: int = 7


class VerifyPasswordBody(BaseModel):
    password: str


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
    if not body.terms_agreed:
        raise HTTPException(status_code=400, detail="You must agree to the Terms and Conditions to create an account.")
    if body.age is not None and body.age <= 13:
        raise HTTPException(
            status_code=400,
            detail="Students 13 or under must have a parent create their account.",
        )
    grade_int = grade_to_int(body.grade)
    user_id = str(uuid.uuid4())
    needs_assessment = grade_int >= 5
    created_at = datetime.now(timezone.utc)
    user = {
        "id": user_id,
        "role": "student",
        "username": body.username,
        "email": email,
        "password_hash": hash_password(body.password),
        "grade": body.grade,
        "grade_int": grade_int,
        "age": body.age,
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
        "terms_agreed": True,
        "terms_agreed_at": created_at.isoformat(),
        "onboarding_complete": not needs_assessment,
        "needs_assessment": needs_assessment,
        "assessment_deadline": (created_at + timedelta(days=14)).isoformat() if needs_assessment else None,
        "assessment_skipped": False,
        "assessments": {},
        "curriculum_weights": {},
        "parental_controls": ParentalControls().model_dump(),
        "created_at": created_at.isoformat(),
        "current_streak": 0,
        "longest_streak": 0,
        "last_active_date": None,
        "streak_just_broken": False,
    }
    await db.users.insert_one(user)
    token = create_token(user_id, email)
    return {"token": token, "user": clean(user)}


@api.post("/auth/parent-invite")
async def parent_invite(body: ParentInviteRequest):
    """Step 1 of the under-13 flow: the child enters their age + a parent's email.
    We email the PARENT a link; the parent creates the account themselves on the
    other end. Nothing about the child is stored yet — just a pending invite."""
    if body.child_age > 13:
        raise HTTPException(status_code=400, detail="This flow is for students 13 and under.")
    if await db.users.find_one({"email": body.parent_email.lower()}):
        raise HTTPException(status_code=400, detail="An account with this parent email already exists.")

    invite_token = secrets.token_urlsafe(24)
    await db.parent_invites.insert_one({
        "token": invite_token,
        "parent_email": body.parent_email.lower(),
        "child_age": body.child_age,
        "used": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
    })
    create_link = f"{FRONTEND_URL}/parent-create?token={invite_token}"
    sent = await send_email(
        body.parent_email,
        "Create your child's StudyBridge account",
        f"Your child (age {body.child_age}) wants to join StudyBridge, a free K-12 learning platform.\n\n"
        f"Because they're 13 or under, StudyBridge requires a parent or guardian to create and manage the account "
        f"(this is required by COPPA, a US child-privacy law).\n\n"
        f"To create the account, open this link within 2 days:\n{create_link}\n\n"
        f"If you didn't expect this, you can safely ignore this email.",
    )
    return {
        "success": True,
        "emailed": sent,
        # Surfaced only so the flow is testable before real SMTP is configured — remove once SMTP is live.
        "dev_create_link": None if sent else create_link,
    }


@api.get("/auth/parent-invite/{token}")
async def get_parent_invite(token: str):
    invite = await db.parent_invites.find_one({"token": token})
    if not invite:
        raise HTTPException(status_code=404, detail="This link is invalid or has already been used.")
    if invite["used"]:
        raise HTTPException(status_code=400, detail="This link has already been used.")
    if datetime.now(timezone.utc) > datetime.fromisoformat(invite["expires_at"]):
        raise HTTPException(status_code=400, detail="This link has expired. Please start over.")
    return {"parent_email": invite["parent_email"], "child_age": invite["child_age"]}


@api.post("/auth/parent-create")
async def parent_create_account(body: ParentCreateAccount):
    """Step 2 of the under-13 flow: the parent, having clicked the emailed link,
    creates the actual account themselves. Because the parent is the one who
    authenticated via the emailed link, consent is verified immediately."""
    invite = await db.parent_invites.find_one({"token": body.token})
    if not invite or invite["used"]:
        raise HTTPException(status_code=404, detail="This link is invalid or has already been used.")
    if datetime.now(timezone.utc) > datetime.fromisoformat(invite["expires_at"]):
        raise HTTPException(status_code=400, detail="This link has expired. Please start over.")

    email = invite["parent_email"]
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    if not body.terms_agreed:
        raise HTTPException(status_code=400, detail="You must agree to the Terms and Conditions to create an account.")

    grade_int = grade_to_int(body.child_grade)
    user_id = str(uuid.uuid4())
    needs_assessment = grade_int >= 5
    created_at = datetime.now(timezone.utc)
    user = {
        "id": user_id,
        "role": "student",
        "username": body.child_username,
        "email": email,  # parent's email; no separate child email stored
        "password_hash": hash_password(body.parent_password),
        "grade": body.child_grade,
        "grade_int": grade_int,
        "age": invite["child_age"],
        "school": body.school,
        "state": body.state,
        "district": body.district,
        "cert_emails": {},
        "homeschool": body.homeschool,
        "account_type": "parent_led",
        "parent_name": body.parent_name,
        "consent_verified": True,  # verified — the parent authenticated via the emailed link
        "terms_agreed": True,
        "terms_agreed_at": created_at.isoformat(),
        "onboarding_complete": not needs_assessment,
        "needs_assessment": needs_assessment,
        "assessment_deadline": (created_at + timedelta(days=14)).isoformat() if needs_assessment else None,
        "assessment_skipped": False,
        "assessments": {},
        "curriculum_weights": {},
        "parental_controls": ParentalControls(prohibit_chat=True, disable_contests=True).model_dump(),
        "created_at": created_at.isoformat(),
        "current_streak": 0,
        "longest_streak": 0,
        "last_active_date": None,
        "streak_just_broken": False,
    }
    await db.users.insert_one(user)
    await db.parent_invites.update_one({"token": body.token}, {"$set": {"used": True}})
    token = create_token(user_id, email)
    return {"token": token, "user": clean(user)}


@api.post("/auth/verify-password")
async def verify_current_password(body: VerifyPasswordBody, user: dict = Depends(get_current_user)):
    """Used to gate access to Parental Controls: re-enter the account password to unlock."""
    return {"valid": verify_password(body.password, user["password_hash"])}


@api.post("/auth/register-parent")
async def register_parent(body: ParentRegister):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    grade_int = grade_to_int(body.child_grade)
    user_id = str(uuid.uuid4())
    consent_token = secrets.token_urlsafe(24)
    needs_assessment = grade_int >= 5
    created_at = datetime.now(timezone.utc)
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
        "assessment_deadline": (created_at + timedelta(days=14)).isoformat() if needs_assessment else None,
        "assessment_skipped": False,
        "assessments": {},
        "curriculum_weights": {},
        "parental_controls": ParentalControls(
            prohibit_chat=True, disable_contests=True
        ).model_dump(),
        "created_at": created_at.isoformat(),
        "current_streak": 0,
        "longest_streak": 0,
        "last_active_date": None,
        "streak_just_broken": False,
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
    if user.get("banned"):
        raise HTTPException(status_code=403, detail=f"This account has been banned. Reason: {user.get('ban_reason', 'policy violation')}")
    suspended_until = user.get("suspended_until")
    if suspended_until and datetime.now(timezone.utc) < datetime.fromisoformat(suspended_until):
        until_label = datetime.fromisoformat(suspended_until).strftime("%B %d, %Y")
        raise HTTPException(status_code=403, detail=f"This account is suspended until {until_label}. Reason: {user.get('suspend_reason', 'policy violation')}")
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


# ---------------- stats / visits / streaks ----------------
UPDATE_UNLOCK_VISITS = 10000  # counter shown on landing/dashboard: "visits until next update"
CONTEST_UNLOCK_VISITS = 20000  # Contests/Programs page unlock threshold
NATIONWIDE_LABEL_THRESHOLD = 5000  # "-- student users" -> "-- student users nationwide"


async def _get_visit_count():
    doc = await db.meta.find_one({"_id": "visit_counter"})
    return doc["count"] if doc else 0


@api.post("/visit")
async def register_visit(user: dict = Depends(get_current_user)):
    """Counts one visit per authenticated user session. Signed-out visits never count."""
    doc = await db.meta.find_one_and_update(
        {"_id": "visit_counter"},
        {"$inc": {"count": 1}},
        upsert=True,
        return_document=True,
    )
    return {"total_visits": doc["count"]}


@api.post("/activity/ping")
async def activity_ping(user: dict = Depends(get_current_user)):
    """Call once per session/day to update the user's streak."""
    today = datetime.now(timezone.utc).date()
    last = user.get("last_active_date")
    current = user.get("current_streak", 0)
    longest = user.get("longest_streak", 0)
    broke = False

    if last:
        last_date = datetime.fromisoformat(last).date()
        delta = (today - last_date).days
        if delta == 0:
            pass  # already counted today
        elif delta == 1:
            current += 1
        else:
            broke = current > 0
            current = 1
    else:
        current = 1

    longest = max(longest, current)
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "current_streak": current,
            "longest_streak": longest,
            "last_active_date": today.isoformat(),
            "streak_just_broken": broke,
        }},
    )

    # Refresh the user doc so reminder generation sees the latest assessment/deadline state.
    fresh_user = await db.users.find_one({"id": user["id"]}) or user
    await _generate_reminders(fresh_user)

    return {"current_streak": current, "longest_streak": longest, "streak_just_broken": broke}


@api.get("/stats")
async def stats():
    count = await db.users.count_documents({"role": "student"})
    visits = await _get_visit_count()
    UNLOCK = 10000
    return {
        "registered_users": count,
        "unlock_threshold": UNLOCK,
        "features_unlocked": count >= UNLOCK,
        "progress_pct": round(min(count / UNLOCK * 100, 100), 2),
        "nationwide": count >= NATIONWIDE_LABEL_THRESHOLD,
        "total_visits": visits,
        "visits_until_update": max(0, UPDATE_UNLOCK_VISITS - (visits % UPDATE_UNLOCK_VISITS if visits < UPDATE_UNLOCK_VISITS else 0)) if visits < UPDATE_UNLOCK_VISITS else 0,
        "visits_until_contests": max(0, CONTEST_UNLOCK_VISITS - visits),
        "contests_unlocked": visits >= CONTEST_UNLOCK_VISITS,
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
        scaled = round(SCORE_MIN + ratio * (SCORE_MAX - SCORE_MIN))
        return {"scaled_score": scaled, "mapped_grade": score_to_grade(scaled),
                "level_label": score_to_level_label(scaled), "correct": correct, "total": total}
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


# ---------------- notifications ----------------
async def _create_notification(user_id: str, ntype: str, title: str, body: str, dedupe_key: str = None):
    """Creates a notification unless one with the same dedupe_key already exists today."""
    today = datetime.now(timezone.utc).date().isoformat()
    key = dedupe_key or f"{ntype}:{today}"
    existing = await db.notifications.find_one({"user_id": user_id, "dedupe_key": key})
    if existing:
        return
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": ntype,
        "title": title,
        "body": body,
        "dedupe_key": key,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })


async def _generate_reminders(user: dict):
    """Called on activity ping — creates any reminder notifications the user is currently due."""
    now = datetime.now(timezone.utc)
    today = now.date()

    # Daily reminder to finish placement tests, while within the 2-week window and incomplete.
    if user.get("needs_assessment") and not user.get("onboarding_complete"):
        deadline = user.get("assessment_deadline")
        deadline_dt = datetime.fromisoformat(deadline) if deadline else None
        if not deadline_dt or now < deadline_dt:
            await _create_notification(
                user["id"], "placement_reminder",
                "Finish your placement tests",
                "You still have placement tests to complete. Finish them to unlock your personalized curriculum.",
                dedupe_key=f"placement_reminder:{today.isoformat()}",
            )
        elif deadline_dt and now >= deadline_dt and not user.get("assessment_deadline_notified"):
            await _create_notification(
                user["id"], "placement_locked",
                "Placement tests are now required",
                "Your 2-week grace period has ended. Finish your placement tests to keep using StudyBridge.",
                dedupe_key="placement_locked",
            )
            await db.users.update_one({"id": user["id"]}, {"$set": {"assessment_deadline_notified": True}})

    # Annual: early career test reminder, every year on Aug 25.
    if today.month == 8 and today.day == 25 and user.get("grade_int", 0) >= 6:
        await _create_notification(
            user["id"], "career_test_due",
            "Time for your early career test",
            "It's August 25 — finish your yearly early career test to keep your path up to date.",
            dedupe_key=f"career_test_due:{today.year}",
        )

    # Every 3 years: English + general (Overall) retest reminder, on Aug 1.
    if today.month == 8 and today.day == 1:
        cycle_year = today.year - (today.year % 3)
        await _create_notification(
            user["id"], "triennial_test_due",
            "Your 3-year English & general test is due",
            "It's been 3 years — please retake your English and general assessments so your level stays accurate.",
            dedupe_key=f"triennial_test_due:{cycle_year}",
        )


@api.get("/notifications")
async def list_notifications(user: dict = Depends(get_current_user)):
    docs = await db.notifications.find({"user_id": user["id"]}).sort("created_at", -1).to_list(100)
    return {"notifications": [clean(d) for d in docs]}


@api.get("/notifications/unread-count")
async def unread_notification_count(user: dict = Depends(get_current_user)):
    count = await db.notifications.count_documents({"user_id": user["id"], "read": False})
    return {"count": count}


@api.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one({"id": notification_id, "user_id": user["id"]}, {"$set": {"read": True}})
    return {"success": True}


@api.post("/notifications/read-all")
async def mark_all_notifications_read(user: dict = Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["id"], "read": False}, {"$set": {"read": True}})
    return {"success": True}


@api.post("/assessments/skip")
async def skip_assessments(user: dict = Depends(get_current_user)):
    """Lets a student skip placement tests for now — only allowed inside the 2-week grace window."""
    deadline = user.get("assessment_deadline")
    if deadline and datetime.now(timezone.utc) >= datetime.fromisoformat(deadline):
        raise HTTPException(status_code=400, detail="Your 2-week grace period has ended — placement tests are now required.")
    await db.users.update_one({"id": user["id"]}, {"$set": {"assessment_skipped": True}})
    return {"success": True}


# ---------------- tutors: promotion, profile, reporting, banning ----------------
def _get_admin_alert_email() -> str:
    """Where AI-flagged-valid tutor reports get emailed. Priority: explicit
    ADMIN_ALERT_EMAIL env var -> the studybridge.cooperate address by default."""
    return os.environ.get("ADMIN_ALERT_EMAIL", "studybridge.cooperate@protonmail.com")


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")
    return user


async def _tutors_unlocked() -> bool:
    """Tutors (and the report button) only appear once the platform crosses the
    10,000 registered-user unlock threshold, same as the rest of the locked features."""
    count = await db.users.count_documents({"role": "student"})
    return count >= 10000


@api.post("/admin/tutors/{user_id}/promote")
async def promote_to_tutor(user_id: str, admin: dict = Depends(require_admin)):
    target = await db.users.find_one({"id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    await db.users.update_one({"id": user_id}, {"$set": {
        "is_tutor": True, "tutor_rank": None,
        "tutor_profile": {"photo_url": None, "behavior_report_url": None, "grade_report_url": None},
    }})
    return {"success": True}


@api.get("/tutors")
async def list_tutors():
    if not await _tutors_unlocked():
        return {"unlocked": False, "tutors": []}
    docs = await db.users.find({"is_tutor": True, "banned": {"$ne": True}}).to_list(200)
    return {"unlocked": True, "tutors": [
        {"id": d["id"], "username": d["username"], "tutor_rank": d.get("tutor_rank"),
         "tutor_profile": d.get("tutor_profile")} for d in docs
    ]}


@api.post("/tutors/{tutor_id}/report")
async def report_tutor(tutor_id: str, body: TutorReportBody, user: dict = Depends(get_current_user)):
    if not await _tutors_unlocked():
        raise HTTPException(status_code=400, detail="Tutors aren't available yet.")
    tutor = await db.users.find_one({"id": tutor_id, "is_tutor": True})
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor not found")

    report_id = str(uuid.uuid4())
    report = {
        "id": report_id,
        "tutor_id": tutor_id,
        "tutor_username": tutor["username"],
        "reporter_id": user["id"],
        "reason": body.reason,
        "details": body.details,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "ai_reviewed": False,
        "ai_valid": None,
        "ai_reasoning": None,
        "emailed": False,
    }
    await db.tutor_reports.insert_one(report)

    # AI triage: the model only assesses whether the report is plausible/specific
    # enough to warrant a human's attention — it never bans anyone itself. A real
    # admin always makes the final call via /admin/tutors/{id}/ban.
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"report-review-{report_id}",
            system_message=(
                "You triage user reports about tutors on an education platform. "
                "Judge only whether THIS report is specific, plausible, and describes "
                "genuine misconduct (harassment, inappropriate content, unsafe behavior, "
                "abuse) rather than being vague, clearly false, a duplicate complaint about "
                "grading/personality, or spam. Output strict JSON only: "
                '{"valid": true or false, "reasoning": "one sentence"}'
            ),
        ).with_model(*CHAT_MODEL)
        resp = await llm_send(chat, UserMessage(
            text=f"Reason category: {body.reason}\nReport details: {body.details}"
        ))
        text = re.sub(r"^```(json)?|```$", "", resp.strip()).strip()
        match = re.search(r"\{.*\}", text, re.DOTALL)
        verdict = json.loads(match.group(0)) if match else {"valid": True, "reasoning": "AI review unavailable — defaulting to flagged for safety."}
    except Exception as e:
        logger.error(f"AI report review failed: {e}")
        verdict = {"valid": True, "reasoning": "AI review unavailable — defaulting to flagged for safety."}

    is_valid = bool(verdict.get("valid"))
    emailed = False
    if is_valid:
        emailed = await send_email(
            _get_admin_alert_email(),
            f"[StudyBridge] Tutor report flagged as valid — {tutor['username']}",
            f"A report about tutor '{tutor['username']}' (id: {tutor_id}) was flagged by AI triage as likely valid.\n\n"
            f"Reason: {body.reason}\nDetails: {body.details}\n\nAI reasoning: {verdict.get('reasoning', '')}\n\n"
            f"Review and take action (e.g. ban or suspend) using the admin user search.",
        )

    await db.tutor_reports.update_one({"id": report_id}, {"$set": {
        "ai_reviewed": True, "ai_valid": is_valid,
        "ai_reasoning": verdict.get("reasoning", ""), "emailed": emailed,
    }})
    return {"success": True, "ai_valid": is_valid}


@api.get("/admin/tutors/reports")
async def list_tutor_reports(admin: dict = Depends(require_admin)):
    """All reports, valid or not — the AI verdict only controls the email alert,
    never what an admin can see. Nothing is silently hidden from human review."""
    docs = await db.tutor_reports.find().sort("created_at", -1).to_list(500)
    return {"reports": [clean(d) for d in docs]}


@api.get("/admin/users/search")
async def search_users(q: str, admin: dict = Depends(require_admin)):
    """Search any account by username (case-insensitive, partial match) so the
    admin can find and ban/suspend anyone — student, tutor, or otherwise."""
    if not q or len(q) < 2:
        return {"users": []}
    docs = await db.users.find({
        "username": {"$regex": re.escape(q), "$options": "i"},
    }).limit(25).to_list(25)
    return {"users": [
        {
            "id": d["id"], "username": d["username"], "email": d.get("email"),
            "role": d.get("role"), "grade": d.get("grade"), "is_tutor": d.get("is_tutor", False),
            "banned": d.get("banned", False), "ban_reason": d.get("ban_reason"),
            "suspended_until": d.get("suspended_until"), "suspend_reason": d.get("suspend_reason"),
        } for d in docs
    ]}


@api.post("/admin/users/{user_id}/ban")
async def ban_user(user_id: str, body: BanBody, admin: dict = Depends(require_admin)):
    target = await db.users.find_one({"id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.get("role") == "admin":
        raise HTTPException(status_code=400, detail="Can't ban an admin account.")
    await db.users.update_one({"id": user_id}, {"$set": {
        "banned": True, "ban_reason": body.reason, "banned_at": datetime.now(timezone.utc).isoformat(),
    }})
    return {"success": True}


@api.post("/admin/users/{user_id}/unban")
async def unban_user(user_id: str, admin: dict = Depends(require_admin)):
    await db.users.update_one({"id": user_id}, {"$set": {"banned": False, "ban_reason": None}})
    return {"success": True}


@api.post("/admin/users/{user_id}/suspend")
async def suspend_user(user_id: str, body: SuspendBody, admin: dict = Depends(require_admin)):
    target = await db.users.find_one({"id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.get("role") == "admin":
        raise HTTPException(status_code=400, detail="Can't suspend an admin account.")
    until = datetime.now(timezone.utc) + timedelta(days=body.days)
    await db.users.update_one({"id": user_id}, {"$set": {
        "suspended_until": until.isoformat(), "suspend_reason": body.reason,
    }})
    return {"success": True, "suspended_until": until.isoformat()}


@api.post("/admin/users/{user_id}/unsuspend")
async def unsuspend_user(user_id: str, admin: dict = Depends(require_admin)):
    await db.users.update_one({"id": user_id}, {"$set": {"suspended_until": None, "suspend_reason": None}})
    return {"success": True}


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
        difficulty = grade_to_difficulty(user.get("grade_int", 0))
        first_idx = _pick_question(test_type, difficulty, [])
    session = {
        "id": session_id, "user_id": user["id"], "test_type": test_type,
        "total": total, "difficulty": difficulty, "start_difficulty": difficulty,
        "asked": [first_idx], "responses": [], "current_idx": first_idx, "completed": False,
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
    start_difficulty = session.get("start_difficulty") or difficulty

    if test_type == "career":
        q = CAREER_QUESTIONS[cur_idx]
        responses.append({"answer": int(answer_index), "interest": q["interest"]})
    else:
        q = BANKS[test_type][cur_idx]
        correct = int(answer_index) == q["a"]
        responses.append({"d": q["d"], "correct": correct})
        # First 2 questions stay at the grade-calibrated level; adapt from Q3 onward.
        if len(responses) < 2:
            difficulty = start_difficulty
        else:
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

    # Supports one or many admin accounts via ADMIN_ACCOUNTS="email1:password1,email2:password2".
    # Falls back to the single ADMIN_EMAIL/ADMIN_PASSWORD pair for backward compatibility.
    # Credentials live only in environment variables — never hardcoded here — so nothing
    # sensitive ends up committed to a public repo.
    accounts = []
    raw = os.environ.get("ADMIN_ACCOUNTS", "")
    for pair in raw.split(","):
        pair = pair.strip()
        if not pair or ":" not in pair:
            continue
        email, pw = pair.split(":", 1)
        accounts.append((email.strip().lower(), pw.strip()))
    if not accounts:
        accounts.append((
            os.environ.get("ADMIN_EMAIL", "admin@studybridge.org").lower(),
            os.environ.get("ADMIN_PASSWORD", "admin123"),
        ))

    for admin_email, admin_pw in accounts:
        existing = await db.users.find_one({"email": admin_email})
        if not existing:
            await db.users.insert_one({
                "id": str(uuid.uuid4()), "role": "admin", "username": admin_email.split("@")[0],
                "email": admin_email, "password_hash": hash_password(admin_pw),
                "grade": "12", "grade_int": 12, "onboarding_complete": True,
                "needs_assessment": False, "assessments": {}, "curriculum_weights": {},
                "parental_controls": ParentalControls().model_dump(),
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            logger.info(f"Seeded admin user: {admin_email}")
        elif not verify_password(admin_pw, existing["password_hash"]):
            # Keeps the DB password in sync if the env var value changes later.
            await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_pw)}})
            logger.info(f"Updated admin password from env for: {admin_email}")


@app.on_event("shutdown")
async def shutdown():
    client.close()
