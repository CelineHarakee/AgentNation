import os
import signal

from dotenv import load_dotenv
import google.generativeai as genai

# Load variables from project .env when running scripts directly.
load_dotenv()

_configured = False
_model_cache = {}


def _resolve_api_key() -> str | None:
    return os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")


def _configure_once() -> None:
    global _configured
    if _configured:
        return

    api_key = _resolve_api_key()
    if api_key:
        genai.configure(api_key=api_key)
    _configured = True


def get_gemini_model(model_name: str = "gemini-2.5-flash"):
    _configure_once()
    if model_name not in _model_cache:
        _model_cache[model_name] = genai.GenerativeModel(model_name)
    return _model_cache[model_name]


def _timeout_handler(signum, frame):
    raise TimeoutError("LLM request timed out")


def generate_text(prompt: str, model_name: str = "gemini-2.5-flash", timeout: int = 5) -> str | None:
    if not _resolve_api_key():
        return None

    model = get_gemini_model(model_name)
    previous_handler = signal.signal(signal.SIGALRM, _timeout_handler)
    try:
        signal.setitimer(signal.ITIMER_REAL, timeout)
        response = model.generate_content(
            prompt,
            request_options={"timeout": timeout},
        )
        text = getattr(response, "text", None)
        return text.strip() if text else None
    except Exception:
        return None
    finally:
        signal.setitimer(signal.ITIMER_REAL, 0)
        signal.signal(signal.SIGALRM, previous_handler)
