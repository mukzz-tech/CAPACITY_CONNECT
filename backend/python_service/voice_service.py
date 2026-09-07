#!/usr/bin/env python3
"""
IMD Capacity Connect - Python Voice Command & Speech Recognition Module
=======================================================================
This service provides Python-powered speech-to-text recognition and 
contextual command routing for the web application.

Capabilities:
- Decodes standard 16-bit PCM WAV audio streams.
- Multi-accent and multi-lingual recognition (en-IN, en-US, hi-IN).
- Intelligent semantic command parsing:
    - Route navigation (courses, profile, chatbot, home, study, etc.)
    - Assessment actions (next, previous, option A/B/C/D, submit)
    - Study & video controls (play video, pause video, read aloud, stop)
    - Universal dictation & active input box filling
- Works both as an HTTP microservice (port 5005) and as a standalone CLI utility.
"""

import sys
import os
import io
import json
import re
import base64
import argparse
from typing import Dict, Any, Optional

try:
    import speech_recognition as sr
except ImportError:
    sr = None
    print("[WARNING] speech_recognition is not installed. Run 'pip install SpeechRecognition'", file=sys.stderr)

try:
    from flask import Flask, request, jsonify
    from flask_cors import CORS
except ImportError:
    Flask = None
    CORS = None

# Initialize recognizer
recognizer = sr.Recognizer() if sr else None
if recognizer:
    recognizer.energy_threshold = 300
    recognizer.dynamic_energy_threshold = True

def parse_voice_command(raw_phrase: str) -> Dict[str, Any]:
    """
    Parses a transcribed voice phrase and maps it to structured actions
    for navigation, assessment control, video/audio playback, and universal box auto-fill.
    """
    if not raw_phrase:
        return {
            "success": False,
            "transcript": "",
            "action": "NONE",
            "message": "Empty phrase"
        }

    phrase = raw_phrase.strip().lower()

    # 1. Courses Navigation
    if (phrase in ["courses", "course", "all courses"] or
        phrase.startswith(("go to course", "open course", "show course", "browse course")) or
        any(k in phrase for k in ["syllabus", "catalogue", "पाठ्यक्रम", "कोर्स"])):
        return {
            "success": True,
            "transcript": raw_phrase,
            "action": "NAVIGATE",
            "target": "/courses",
            "description": "Navigating to Courses...",
            "tone": 620
        }

    # 2. Profile & Certificates Navigation
    if (phrase in ["profile", "my profile", "certificates", "certificate", "scores"] or
        phrase.startswith(("open profile", "go to profile", "my account")) or
        any(k in phrase for k in ["प्रमाणपत्र", "प्रोफ़ाइल"])):
        return {
            "success": True,
            "transcript": raw_phrase,
            "action": "NAVIGATE",
            "target": "/profile",
            "description": "Opening Profile & Certificates...",
            "tone": 620
        }

    # 3. Homepage / Dashboard
    if (phrase in ["home", "homepage", "dashboard", "main page"] or
        phrase.startswith(("go home", "go to home", "open home")) or
        any(k in phrase for k in ["होम", "डैशबोर्ड"])):
        return {
            "success": True,
            "transcript": raw_phrase,
            "action": "NAVIGATE",
            "target": "/",
            "description": "Navigating to Homepage...",
            "tone": 620
        }

    # 4. Chatbot / AI Assistant
    if (phrase in ["chatbot", "chat", "assistant", "ai assistant", "ask ai"] or
        phrase.startswith(("open chatbot", "open chat", "start chat")) or
        any(k in phrase for k in ["चैटबॉट", "सहायक"])):
        return {
            "success": True,
            "transcript": raw_phrase,
            "action": "NAVIGATE",
            "target": "/chatbot",
            "description": "Opening Meteorological Assistant...",
            "tone": 620
        }

    # 5. Study Material / Lectures
    if (phrase in ["study", "study material", "lectures", "notes"] or
        phrase.startswith(("open study", "go to study", "show study")) or
        any(k in phrase for k in ["अध्ययन", "पढ़ाई"])):
        return {
            "success": True,
            "transcript": raw_phrase,
            "action": "NAVIGATE",
            "target": "/study",
            "description": "Opening Study Material...",
            "tone": 620
        }

    # 6. Camera Diagnostics / Proctor Test
    if (phrase in ["camera", "webcam", "test camera", "camera test"] or
        any(k in phrase for k in ["कैमरा"])):
        return {
            "success": True,
            "transcript": raw_phrase,
            "action": "CAMERA_TEST",
            "target": "/profile",
            "description": "Opening Camera Diagnostics...",
            "tone": 620
        }

    # 7. Video Controls
    if (phrase in ["play video", "start video", "resume video", "watch video", "listen video"] or
        any(k in phrase for k in ["वीडियो चलाओ", "लेक्चर चलाओ"])):
        return {
            "success": True,
            "transcript": raw_phrase,
            "action": "VIDEO_PLAY",
            "description": "Playing lecture video...",
            "tone": 620
        }

    if (phrase in ["pause video", "pause lecture", "stop video"] or
        any(k in phrase for k in ["वीडियो रोको"])):
        return {
            "success": True,
            "transcript": raw_phrase,
            "action": "VIDEO_PAUSE",
            "description": "Paused lecture video",
            "tone": 450
        }

    # 8. Read Aloud Study Notes
    if (phrase in ["read aloud", "read notes", "listen notes", "read this", "listen to notes", "speak notes"] or
        any(k in phrase for k in ["बोलकर सुनाओ", "पढ़ो", "सुनो"])):
        return {
            "success": True,
            "transcript": raw_phrase,
            "action": "READ_ALOUD",
            "description": "Reading study notes aloud...",
            "tone": 620
        }

    # 9. Stop / Silence
    if (phrase in ["stop", "stop audio", "quiet", "silence"] or
        any(k in phrase for k in ["रुको", "शांत"])):
        return {
            "success": True,
            "transcript": raw_phrase,
            "action": "STOP",
            "description": "Audio and video stopped",
            "tone": 400
        }

    # 10. Assessment Actions
    if (phrase in ["submit assessment", "submit test", "finish assessment", "submit"] or
        any(k in phrase for k in ["सबमिट"])):
        return {
            "success": True,
            "transcript": raw_phrase,
            "action": "ASSESSMENT_SUBMIT",
            "description": "Submitting Assessment...",
            "tone": 720
        }

    if (phrase in ["next question", "next"] or
        any(k in phrase for k in ["अगला प्रश्न", "अगला"])):
        return {
            "success": True,
            "transcript": raw_phrase,
            "action": "ASSESSMENT_NEXT",
            "description": "Next Question",
            "tone": 620
        }

    if (phrase in ["previous question", "previous", "back", "back question"] or
        any(k in phrase for k in ["पिछला प्रश्न", "पिछला"])):
        return {
            "success": True,
            "transcript": raw_phrase,
            "action": "ASSESSMENT_PREV",
            "description": "Previous Question",
            "tone": 520
        }

    # MCQ Option Selection: "Option A", "Select B", "विकल्प सी", or "A", "B", "C", "D"
    option_match = re.search(r'(?:option|select|choose|answer|विकल्प)\s*([a-d])\b|^([a-d])$', phrase, re.IGNORECASE)
    if option_match:
        opt = (option_match.group(1) or option_match.group(2)).upper()
        return {
            "success": True,
            "transcript": raw_phrase,
            "action": "OPTION_SELECT",
            "option": opt,
            "description": f"Selected Option {opt}",
            "tone": 650
        }

    # 11. Clear Active Input Box
    if phrase in ["clear", "clear box", "clear input", "erase", "मिटाओ"]:
        return {
            "success": True,
            "transcript": raw_phrase,
            "action": "CLEAR_INPUT",
            "fill_text": "",
            "description": "Cleared Input Box",
            "tone": 450
        }

    # 12. Universal Dictation & Auto-Fill
    # Patterns: "type [text]", "write [text]", "search [text]", "fill [text]"
    fill_match = re.match(r'^(?:type|write|fill|search for|search|input|डालो|लिखो)\s+(.+)$', raw_phrase, re.IGNORECASE)
    if fill_match:
        text_to_fill = fill_match.group(1).strip()
        return {
            "success": True,
            "transcript": raw_phrase,
            "action": "FILL_INPUT",
            "fill_text": text_to_fill,
            "description": f"Filled box: '{text_to_fill}'",
            "tone": 720
        }

    # General dictation fallback (fills whatever box is active or visible, or broadcasts to chat)
    return {
        "success": True,
        "transcript": raw_phrase,
        "action": "GENERAL_INPUT",
        "fill_text": raw_phrase,
        "description": f"Heard: '{raw_phrase}'",
        "tone": 720
    }

def transcribe_audio_stream(audio_bytes: bytes, language: str = "en-IN") -> Dict[str, Any]:
    """
    Decodes audio bytes (PCM WAV) and transcribes using Python's speech_recognition.
    Attempts primary language and fallbacks if necessary.
    """
    if not recognizer:
        return {
            "success": False,
            "error": "SpeechRecognition library not loaded on system."
        }

    if not audio_bytes or len(audio_bytes) < 44:  # Minimum WAV header size
        return {
            "success": False,
            "error": "Invalid or empty audio data received."
        }

    try:
        audio_io = io.BytesIO(audio_bytes)
        with sr.AudioFile(audio_io) as source:
            audio_data = recognizer.record(source)

        # Primary language attempt
        transcript = ""
        try:
            transcript = recognizer.recognize_google(audio_data, language=language)
        except sr.UnknownValueError:
            # Try secondary English fallback if Hindi/Regional was requested, or vice versa
            fallback_lang = "en-US" if language != "en-US" else "en-IN"
            try:
                transcript = recognizer.recognize_google(audio_data, language=fallback_lang)
            except Exception:
                return {
                    "success": False,
                    "error": "No recognizable speech detected. Please speak clearly into your microphone.",
                    "code": "NO_SPEECH"
                }
        except sr.RequestError as e:
            return {
                "success": False,
                "error": f"Speech recognition service request error: {str(e)}",
                "code": "SERVICE_ERROR"
            }

        parsed = parse_voice_command(transcript)
        return {
            "success": True,
            "transcript": transcript,
            "command": parsed
        }

    except Exception as e:
        return {
            "success": False,
            "error": f"Audio processing error: {str(e)}"
        }

# Flask Application Definition
app = Flask(__name__)
if CORS:
    CORS(app, resources={r"/*": {"origins": "*"}})

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "online",
        "service": "IMD Capacity Connect Python Voice Service",
        "version": "1.0.0",
        "engine": "SpeechRecognition / Google Web Speech API",
        "languages": ["en-IN", "en-US", "hi-IN"]
    })

@app.route("/transcribe", methods=["POST", "OPTIONS"])
def transcribe_endpoint():
    if request.method == "OPTIONS":
        return "", 204

    language = request.args.get("language") or "en-IN"
    audio_bytes = None

    # Handle multipart form data
    if "audio" in request.files:
        audio_file = request.files["audio"]
        language = request.form.get("language", language)
        audio_bytes = audio_file.read()

    # Handle direct JSON with base64 payload
    elif request.is_json:
        data = request.get_json() or {}
        language = data.get("language", language)
        b64 = data.get("audio_base64", "")
        if b64:
            if "," in b64:
                b64 = b64.split(",", 1)[1]
            try:
                audio_bytes = base64.b64decode(b64)
            except Exception as e:
                return jsonify({"success": False, "error": f"Base64 decode failed: {str(e)}"}), 400

    # Handle raw binary payload
    elif request.data:
        audio_bytes = request.data

    if not audio_bytes:
        return jsonify({"success": False, "error": "No audio payload provided in request."}), 400

    result = transcribe_audio_stream(audio_bytes, language=language)
    status_code = 200 if result.get("success") else 422
    return jsonify(result), status_code

@app.route("/command", methods=["POST", "OPTIONS"])
def command_endpoint():
    if request.method == "OPTIONS":
        return "", 204

    text = ""
    data = request.get_json(silent=True)
    if isinstance(data, dict):
        text = data.get("text", "")
    elif request.form and "text" in request.form:
        text = request.form["text"]
    elif request.data:
        try:
            raw = request.data.decode("utf-8", errors="ignore").strip()
            if raw.startswith("{") and raw.endswith("}"):
                parsed_json = json.loads(raw)
                text = parsed_json.get("text", "")
            else:
                text = raw
        except Exception:
            text = ""

    text = str(text).strip()
    if not text:
        return jsonify({"success": False, "error": "No text provided for command parsing."}), 400

    parsed = parse_voice_command(text)
    return jsonify({
        "success": True,
        "transcript": text,
        "command": parsed
    })

def main():
    parser = argparse.ArgumentParser(description="IMD Capacity Connect Voice Command Service")
    parser.add_argument("--port", type=int, default=5005, help="HTTP server port (default: 5005)")
    parser.add_argument("--host", type=str, default="127.0.0.1", help="HTTP server host (default: 127.0.0.1)")
    parser.add_argument("--transcribe", type=str, help="Path to WAV audio file to transcribe via CLI")
    parser.add_argument("--command", type=str, help="Parse command text via CLI")
    parser.add_argument("--language", type=str, default="en-IN", help="Language code (en-IN, en-US, hi-IN)")
    args = parser.parse_args()

    if args.command:
        result = parse_voice_command(args.command)
        print(json.dumps(result, indent=2))
        return

    if args.transcribe:
        if not os.path.exists(args.transcribe):
            print(f"Error: File '{args.transcribe}' not found.", file=sys.stderr)
            sys.exit(1)
        with open(args.transcribe, "rb") as f:
            audio_data = f.read()
        result = transcribe_audio_stream(audio_data, language=args.language)
        print(json.dumps(result, indent=2))
        return

    # Run HTTP Service
    print(f"============================================================")
    print(f"IMD Python Voice Service starting on http://{args.host}:{args.port}")
    print(f"Engine: SpeechRecognition with Indian English / Hindi NLP")
    print(f"============================================================")
    app.run(host=args.host, port=args.port, debug=False)

if __name__ == "__main__":
    main()
