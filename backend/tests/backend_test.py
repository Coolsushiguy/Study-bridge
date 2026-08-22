"""StudyBridge backend tests - pytest.

Covers auth (admin/login, student/parent register, consent, K-5 rejection),
stats, subjects list, chapter AI generation + caching, exercise submission,
assessments (english/overall/career + gating), AI helper (text + image),
parental controls, feedback eligibility.
"""
import os
import uuid
import base64
import io
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if False else "https://learn-bridge-44.preview.emergentagent.com"
# Prefer env if present at runtime
BASE_URL = os.environ.get("BACKEND_URL", BASE_URL)

ADMIN_EMAIL = "admin@studybridge.org"
ADMIN_PASSWORD = "StudyBridge2026!"

TIMEOUT = 120  # LLM calls can be slow


@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


@pytest.fixture(scope="session")
def admin_token(s):
    r = s.post(f"{BASE_URL}/api/auth/login",
               json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=TIMEOUT)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def student_data(s):
    """Register a fresh grade-8 student for the session and share the token."""
    email = f"TEST_stud_{uuid.uuid4().hex[:8]}@example.com"
    payload = {
        "username": "teststudent",
        "email": email,
        "password": "Passw0rd!",
        "grade": "8",
        "school": "Test School",
        "state": "California",
        "district": "Test District",
        "homeschool": False,
    }
    r = s.post(f"{BASE_URL}/api/auth/register-student", json=payload, timeout=TIMEOUT)
    assert r.status_code == 200, r.text
    data = r.json()
    return {"email": email, "token": data["token"], "user": data["user"]}


def auth_headers(tok):
    return {"Authorization": f"Bearer {tok}"}


# ---------------- Auth ----------------
class TestAuth:
    def test_admin_login(self, s, admin_token):
        r = s.get(f"{BASE_URL}/api/auth/me", headers=auth_headers(admin_token), timeout=TIMEOUT)
        assert r.status_code == 200
        u = r.json()
        assert u["email"] == ADMIN_EMAIL
        assert u["role"] == "admin"
        assert "password_hash" not in u
        assert "_id" not in u

    def test_admin_login_bad_password(self, s):
        r = s.post(f"{BASE_URL}/api/auth/login",
                   json={"email": ADMIN_EMAIL, "password": "wrong"}, timeout=TIMEOUT)
        assert r.status_code == 401

    def test_register_student_grade6plus(self, student_data):
        assert student_data["token"]
        u = student_data["user"]
        assert u["needs_assessment"] is True
        assert u["role"] == "student"
        assert u["grade_int"] == 8

    def test_register_student_k5_rejected(self, s):
        email = f"TEST_k5_{uuid.uuid4().hex[:8]}@example.com"
        r = s.post(f"{BASE_URL}/api/auth/register-student", json={
            "username": "younguser", "email": email, "password": "Passw0rd!",
            "grade": "3", "homeschool": False,
        }, timeout=TIMEOUT)
        assert r.status_code == 400
        assert "parent" in r.json().get("detail", "").lower()

    def test_register_parent_k5_with_consent(self, s):
        email = f"TEST_parent_{uuid.uuid4().hex[:8]}@example.com"
        r = s.post(f"{BASE_URL}/api/auth/register-parent", json={
            "parent_name": "Test Parent", "email": email, "password": "Passw0rd!",
            "child_username": "childuser", "child_grade": "2",
        }, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["token"]
        assert d["user"]["consent_verified"] is False
        assert "consent_link" in d and "token=" in d["consent_link"]
        token = d["consent_link"].split("token=")[-1]
        # verify
        r2 = s.get(f"{BASE_URL}/api/parent/consent/verify", params={"token": token}, timeout=TIMEOUT)
        assert r2.status_code == 200
        assert r2.json()["success"] is True
        # user now consent_verified
        me = s.get(f"{BASE_URL}/api/auth/me", headers=auth_headers(d["token"]), timeout=TIMEOUT)
        assert me.json()["consent_verified"] is True


# ---------------- Stats ----------------
class TestStats:
    def test_stats(self, s):
        r = s.get(f"{BASE_URL}/api/stats", timeout=TIMEOUT)
        assert r.status_code == 200
        d = r.json()
        assert d["unlock_threshold"] == 10000
        assert d["features_unlocked"] is False
        assert isinstance(d["registered_users"], int)


# ---------------- Subjects & chapter (LLM) ----------------
class TestCurriculum:
    def test_list_subjects(self, s, student_data):
        r = s.get(f"{BASE_URL}/api/subjects", headers=auth_headers(student_data["token"]), timeout=TIMEOUT)
        assert r.status_code == 200
        subs = r.json()["subjects"]
        assert len(subs) == 4
        keys = {x["key"] for x in subs}
        assert keys == {"math", "english", "science", "social"}

    def test_subject_detail(self, s, student_data):
        r = s.get(f"{BASE_URL}/api/subjects/math", headers=auth_headers(student_data["token"]), timeout=TIMEOUT)
        assert r.status_code == 200
        d = r.json()
        assert d["subject"]["key"] == "math"
        assert len(d["chapters"]) == 4

    def test_chapter_generate_and_cache(self, s, student_data):
        h = auth_headers(student_data["token"])
        url = f"{BASE_URL}/api/subjects/math/chapters/number-sense"
        import time
        t0 = time.time()
        r = s.get(url, headers=h, timeout=180)
        t1 = time.time() - t0
        assert r.status_code == 200, r.text
        c = r.json()["content"]
        assert "lessons" in c and isinstance(c["lessons"], list) and len(c["lessons"]) >= 1
        assert "exercises" in c and len(c["exercises"]) >= 1
        assert "glossary" in c
        # each exercise has answer_index
        for ex in c["exercises"]:
            assert "answer_index" in ex and "options" in ex
        # second call is cached & fast
        t0 = time.time()
        r2 = s.get(url, headers=h, timeout=30)
        t2 = time.time() - t0
        assert r2.status_code == 200
        assert t2 < max(10, t1)  # cached call should be much faster
        # Save exercises for next test via env-like attribute
        TestCurriculum._exercises = c["exercises"]

    def test_exercise_submit(self, s, student_data):
        exs = getattr(TestCurriculum, "_exercises", None)
        assert exs, "run chapter test first"
        answers = [ex["answer_index"] for ex in exs]  # all correct
        r = s.post(f"{BASE_URL}/api/exercises/submit",
                   headers=auth_headers(student_data["token"]),
                   json={"subject": "math", "chapter": "number-sense", "answers": answers},
                   timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["score"] == 100
        assert d["state"] == "mastery"
        assert d["best_score"] == 100

    def test_exercise_submit_partial(self, s, student_data):
        exs = getattr(TestCurriculum, "_exercises", None)
        assert exs
        # all wrong -> pick (answer+1) % len(options)
        answers = [(ex["answer_index"] + 1) % len(ex["options"]) for ex in exs]
        r = s.post(f"{BASE_URL}/api/exercises/submit",
                   headers=auth_headers(student_data["token"]),
                   json={"subject": "math", "chapter": "number-sense", "answers": answers},
                   timeout=TIMEOUT)
        assert r.status_code == 200
        d = r.json()
        assert d["best_score"] == 100  # unchanged due to prior mastery


# ---------------- Assessments ----------------
class TestAssessments:
    def test_english_and_overall(self, s, student_data):
        h = auth_headers(student_data["token"])
        for t in ("english", "overall"):
            r = s.get(f"{BASE_URL}/api/assessments/{t}", headers=h, timeout=TIMEOUT)
            assert r.status_code == 200
            assert len(r.json()["questions"]) >= 5

    def test_career_grade6_allowed(self, s, student_data):
        r = s.get(f"{BASE_URL}/api/assessments/career",
                  headers=auth_headers(student_data["token"]), timeout=TIMEOUT)
        assert r.status_code == 200

    def test_career_denied_for_k5(self, s):
        # Register K-5 via parent path
        email = f"TEST_parent_{uuid.uuid4().hex[:8]}@example.com"
        r = s.post(f"{BASE_URL}/api/auth/register-parent", json={
            "parent_name": "P", "email": email, "password": "Passw0rd!",
            "child_username": "child", "child_grade": "3",
        }, timeout=TIMEOUT)
        tok = r.json()["token"]
        r2 = s.get(f"{BASE_URL}/api/assessments/career",
                   headers=auth_headers(tok), timeout=TIMEOUT)
        assert r2.status_code == 403

    def test_submit_english(self, s, student_data):
        h = auth_headers(student_data["token"])
        # All correct: known answers
        r = s.post(f"{BASE_URL}/api/assessments/submit", headers=h,
                   json={"test_type": "english", "answers": [2, 1, 2, 1, 1]},
                   timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["result"]["correct"] == 5
        assert d["result"]["level"] == "Advanced"

    def test_submit_overall(self, s, student_data):
        r = s.post(f"{BASE_URL}/api/assessments/submit",
                   headers=auth_headers(student_data["token"]),
                   json={"test_type": "overall", "answers": [1, 2, 1, 1, 0, 2]},
                   timeout=TIMEOUT)
        assert r.status_code == 200
        d = r.json()
        assert d["result"]["correct"] == 6
        assert "scaled_score" in d["result"]

    def test_submit_career_and_onboarding(self, s, student_data):
        r = s.post(f"{BASE_URL}/api/assessments/submit",
                   headers=auth_headers(student_data["token"]),
                   json={"test_type": "career", "answers": [3, 2, 3, 2, 1]},
                   timeout=TIMEOUT)
        assert r.status_code == 200
        d = r.json()
        assert d["onboarding_complete"] is True
        assert "top_interests" in d["result"]


# ---------------- AI helper ----------------
def _make_png_b64():
    """Real PNG with content (non-uniform)."""
    try:
        from PIL import Image, ImageDraw
        img = Image.new("RGB", (120, 80), (255, 255, 255))
        d = ImageDraw.Draw(img)
        d.rectangle([10, 10, 60, 60], fill=(30, 90, 200))
        d.line([0, 0, 120, 80], fill=(0, 0, 0), width=3)
        d.text((15, 65), "2+3=?", fill=(0, 0, 0))
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return base64.b64encode(buf.getvalue()).decode()
    except Exception:
        return None


class TestAiHelper:
    def test_text_reply(self, s, student_data):
        r = s.post(f"{BASE_URL}/api/ai/helper",
                   headers=auth_headers(student_data["token"]),
                   json={"message": "How do I add 2+3?", "session_id": "sess1"},
                   timeout=180)
        assert r.status_code == 200, r.text
        reply = r.json()["reply"]
        assert isinstance(reply, str) and len(reply) > 0

    def test_image_reply(self, s, student_data):
        b64 = _make_png_b64()
        if not b64:
            pytest.skip("PIL missing")
        r = s.post(f"{BASE_URL}/api/ai/helper",
                   headers=auth_headers(student_data["token"]),
                   json={"message": "What math is in this image?",
                         "session_id": "sess-img", "image_base64": b64},
                   timeout=180)
        assert r.status_code == 200, r.text
        assert len(r.json()["reply"]) > 0


# ---------------- Parental controls & feedback ----------------
class TestControlsFeedback:
    def test_update_controls(self, s, student_data):
        r = s.put(f"{BASE_URL}/api/parental-controls",
                  headers=auth_headers(student_data["token"]),
                  json={"prohibit_chat": True, "hide_real_name": True,
                        "restrict_usernames": False, "disable_contests": True},
                  timeout=TIMEOUT)
        assert r.status_code == 200
        assert r.json()["parental_controls"]["prohibit_chat"] is True

    def test_feedback_flow(self, s, student_data):
        h = auth_headers(student_data["token"])
        r = s.get(f"{BASE_URL}/api/feedback/eligible", headers=h, timeout=TIMEOUT)
        assert r.status_code == 200
        assert r.json()["eligible"] is True
        r2 = s.post(f"{BASE_URL}/api/feedback", headers=h,
                    json={"rating": 5, "comment": "Great app"}, timeout=TIMEOUT)
        assert r2.status_code == 200
        r3 = s.get(f"{BASE_URL}/api/feedback/eligible", headers=h, timeout=TIMEOUT)
        assert r3.json()["eligible"] is False
