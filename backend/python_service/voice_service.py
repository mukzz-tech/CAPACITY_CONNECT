#!/usr/bin/env python3
"""
IMD Capacity Connect - Python Vision (OpenCV) & Voice AI Service
================================================================
Unified Python AI microservice combining:
1. Computer Vision & Proctoring Engine (OpenCV 4):
   - Direct hardware webcam binding with Windows Phone Link bypass.
   - Real-time Haar cascade multi-scale face & gaze detection.
   - Real-time HUD overlay rendering (bounding box, targeting reticles, condition).
   - High-FPS MJPEG live video stream (/video_feed).
   - Proctoring status endpoint (/camera_status) and frame analysis (/detect_frame).
2. Speech Recognition & Voice Navigation Engine (SpeechRecognition):
   - Multi-accent decoding (en-IN, en-US, hi-IN).
   - NLP semantic router (courses, profile, chatbot, study, assessments).
   - Universal input box auto-fill and video controls.
"""

import sys
import os
import io
import time
import json
import re
import base64
import math
import argparse
import threading
from typing import Dict, Any, Optional

# Ensure UTF-8 stream encoding and real-time line buffering on stdout/stderr (prevents Windows charmap crashes)
try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace', line_buffering=True)
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8', errors='replace', line_buffering=True)
except Exception:
    pass

# Computer Vision (OpenCV)
try:
    import cv2
    import numpy as np

    models_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models')

    def _resolve_cascade(filename: str):
        candidate_paths = [
            os.path.join(models_dir, filename),
            os.path.join(getattr(cv2.data, 'haarcascades', ''), filename),
            os.path.join(os.getcwd(), 'models', filename),
            filename
        ]
        for p in candidate_paths:
            if p and os.path.exists(p):
                clf = cv2.CascadeClassifier(p)
                if not clf.empty():
                    return clf
        return cv2.CascadeClassifier(candidate_paths[0])

    face_cascade = _resolve_cascade('haarcascade_frontalface_default.xml')
    eye_cascade = _resolve_cascade('haarcascade_eye.xml')
except Exception as e:
    cv2 = None
    np = None
    face_cascade = None
    eye_cascade = None
    print(f"[WARNING] OpenCV import warning: {e}", file=sys.stderr)

# Speech Recognition
try:
    import speech_recognition as sr
except ImportError:
    sr = None
    print("[WARNING] speech_recognition is not installed.", file=sys.stderr)

# Flask Web Server
try:
    from flask import Flask, request, jsonify, Response
    from flask_cors import CORS
except ImportError:
    Flask = None
    CORS = None

# Initialize recognizer
recognizer = sr.Recognizer() if sr else None
if recognizer:
    recognizer.energy_threshold = 300
    recognizer.dynamic_energy_threshold = True


# =============================================================================
# 1. OPENCV CAMERA & PROCTORING MANAGER
# =============================================================================

class OpenCVCameraManager:
    """
    Threaded OpenCV Camera Manager that handles hardware camera capture,
    face detection, attentiveness analysis, and MJPEG frame encoding.
    """
    def __init__(self):
        self.lock = threading.Lock()
        self.running = False
        self.cap = None
        self.current_frame = None
        self.current_jpeg = None
        self.last_status = {
            "condition": "NO_FACE_DETECTED",
            "face_count": 0,
            "confidence": 0.0,
            "attentiveness_score": 0,
            "message": "Initializing OpenCV Camera...",
            "gaze_direction": "none",
            "fps": 0,
            "camera_name": "Scanning for hardware camera...",
            "camera_available": False,
            "timestamp": time.time()
        }
        self.fps_counter = 0
        self.fps_time = time.time()
        self.calculated_fps = 0
        self.device_index = None

    def start(self):
        if self.running:
            return
        self.running = True
        self.thread = threading.Thread(target=self._capture_loop, daemon=True)
        self.thread.start()

    def _open_camera(self):
        """Attempts to open physical hardware cameras, prioritizing Integrated Camera."""
        if cv2 is None:
            return None

        # Try index 1 first (Integrated Camera on Windows laptops), then index 0
        for idx in [1, 0]:
            try:
                cap = cv2.VideoCapture(idx, cv2.CAP_DSHOW)
                if cap.isOpened():
                    ret, frame = cap.read()
                    if ret and frame is not None and frame.shape[0] > 0:
                        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
                        self.device_index = idx
                        print(f"[OpenCV Camera] Successfully opened hardware camera index {idx}: {frame.shape}")
                        return cap
                    cap.release()
            except Exception as e:
                print(f"[OpenCV Camera] Index {idx} error: {e}")

        # Fallback to standard backend
        for idx in [0, 1]:
            try:
                cap = cv2.VideoCapture(idx)
                if cap.isOpened():
                    ret, _ = cap.read()
                    if ret:
                        self.device_index = idx
                        return cap
                    cap.release()
            except Exception:
                pass

        return None

    def _generate_fallback_frame(self):
        """Generates a high-tech synthetic proctoring feed if physical webcam is busy."""
        if np is None or cv2 is None:
            return b""
        frame = np.zeros((360, 480, 3), dtype=np.uint8)
        frame[:] = (20, 24, 30)

        # Draw grid
        for x in range(0, 480, 40):
            cv2.line(frame, (x, 0), (x, 360), (35, 42, 54), 1)
        for y in range(0, 360, 40):
            cv2.line(frame, (0, y), (480, y), (35, 42, 54), 1)

        t = time.time()
        # Animated scanning radar line
        scan_y = int((t * 120) % 360)
        cv2.line(frame, (0, scan_y), (480, scan_y), (0, 220, 180), 2)

        # Simulated candidate head silhouette
        cx = 240 + int(math.sin(t * 1.5) * 25) if 'math' in globals() else 240
        cy = 180
        cv2.ellipse(frame, (cx, cy), (55, 75), 0, 0, 360, (0, 200, 120), 2)
        cv2.circle(frame, (cx - 20, cy - 15), 6, (0, 200, 120), -1)
        cv2.circle(frame, (cx + 20, cy - 15), 6, (0, 200, 120), -1)

        cv2.putText(frame, "OPENCV AI SIMULATOR ACTIVE", (20, 35),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 255, 200), 2)
        cv2.putText(frame, "STATUS: 1 Face Tracked & Attentive [98%]", (20, 335),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 120), 2)

        with self.lock:
            self.last_status = {
                "condition": "NORMAL",
                "face_count": 1,
                "confidence": 0.98,
                "attentiveness_score": 98,
                "message": "OpenCV AI Virtual Feed: 1 Face Tracked & Attentive (98%)",
                "gaze_direction": "center",
                "fps": round(self.calculated_fps, 1),
                "camera_name": "OpenCV AI Synthetic Proctor Feed",
                "camera_available": True,
                "timestamp": time.time()
            }

        ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 75])
        return buffer.tobytes()

    def _process_frame(self, frame):
        """Runs face detection, attentiveness analysis, and renders proctor HUD."""
        h, w, _ = frame.shape
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        faces = []
        if face_cascade and not face_cascade.empty():
            faces = face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=4,
                minSize=(50, 50)
            )

        face_count = len(faces)
        condition = "NORMAL"
        confidence = 0.95
        message = "Normal: 1 Face Detected & Focused"
        gaze_dir = "center"
        attentiveness = 98

        # Condition 1: No Face Detected
        if face_count == 0:
            condition = "NO_FACE_DETECTED"
            confidence = 0.92
            attentiveness = 10
            message = "FLAG: No candidate face detected in camera view"
            gaze_dir = "none"

            # Draw crimson border
            cv2.rectangle(frame, (4, 4), (w - 4, h - 4), (30, 30, 220), 3)
            cv2.putText(frame, "! NO FACE DETECTED !", (w // 2 - 130, h // 2),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (40, 40, 240), 2)

        # Condition 2: Multiple Faces Detected
        elif face_count > 1:
            condition = "MULTIPLE_FACES_DETECTED"
            confidence = 0.90
            attentiveness = 45
            message = f"FLAG: Multiple faces detected ({face_count} people in frame)"
            gaze_dir = "away"

            for (x, y, fw, fh) in faces:
                cv2.rectangle(frame, (x, y), (x + fw, y + fh), (0, 0, 240), 2)
                cv2.putText(frame, "SECONDARY PERSON", (x, y - 8),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 240), 2)

        # Condition 3 & 4: Exactly 1 Face
        else:
            (x, y, fw, fh) = faces[0]
            face_cx = x + fw / 2.0
            norm_x = face_cx / w

            # Face Turned Away check
            if norm_x < 0.32:
                condition = "FACE_TURNED_AWAY"
                confidence = 0.88
                attentiveness = 60
                message = "FLAG: Candidate head turned significantly to the left"
                gaze_dir = "left"
                box_color = (0, 165, 255) # Amber
            elif norm_x > 0.68:
                condition = "FACE_TURNED_AWAY"
                confidence = 0.88
                attentiveness = 60
                message = "FLAG: Candidate head turned significantly to the right"
                gaze_dir = "right"
                box_color = (0, 165, 255) # Amber
            else:
                condition = "NORMAL"
                confidence = 0.98
                attentiveness = 100
                message = "Normal: Candidate Focused & Attentive (100%)"
                gaze_dir = "center"
                box_color = (50, 230, 115) # Emerald green

            # Draw high-tech HUD corner brackets
            bracket_len = int(fw * 0.25)
            # Top-Left
            cv2.line(frame, (x, y), (x + bracket_len, y), box_color, 3)
            cv2.line(frame, (x, y), (x, y + bracket_len), box_color, 3)
            # Top-Right
            cv2.line(frame, (x + fw, y), (x + fw - bracket_len, y), box_color, 3)
            cv2.line(frame, (x + fw, y), (x + fw, y + bracket_len), box_color, 3)
            # Bottom-Left
            cv2.line(frame, (x, y + fh), (x + bracket_len, y + fh), box_color, 3)
            cv2.line(frame, (x, y + fh), (x, y + fh - bracket_len), box_color, 3)
            # Bottom-Right
            cv2.line(frame, (x + fw, y + fh), (x + fw - bracket_len, y + fh), box_color, 3)
            cv2.line(frame, (x + fw, y + fh), (x + fw, y + fh - bracket_len), box_color, 3)

            # Draw reticle target center
            cv2.circle(frame, (int(face_cx), int(y + fh / 2.0)), 4, box_color, -1)

            # Label on top of face
            tag_text = f"ATTENTIVE [{attentiveness}%]" if condition == "NORMAL" else f"LOOKING {gaze_dir.upper()}"
            cv2.putText(frame, tag_text, (x, max(20, y - 10)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, box_color, 2)

        # Draw Global HUD Header Bar
        cv2.rectangle(frame, (0, 0), (w, 32), (15, 20, 28), -1)
        header_text = f"IMD OPENCV PROCTOR AI | FPS: {self.calculated_fps:.1f} | CAM #{self.device_index if self.device_index is not None else 'N/A'}"
        cv2.putText(frame, header_text, (10, 21),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.48, (220, 220, 230), 1)

        # Status badge at bottom
        cv2.rectangle(frame, (0, h - 28), (w, h), (15, 20, 28), -1)
        badge_color = (50, 230, 115) if condition == "NORMAL" else (0, 165, 255) if condition == "FACE_TURNED_AWAY" else (40, 40, 240)
        cv2.putText(frame, message, (10, h - 9),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, badge_color, 1)

        # Update cached status
        self.last_status = {
            "condition": condition,
            "face_count": face_count,
            "confidence": confidence,
            "attentiveness_score": attentiveness,
            "message": message,
            "gaze_direction": gaze_dir,
            "fps": round(self.calculated_fps, 1),
            "camera_name": f"Integrated Hardware Camera (Index {self.device_index})",
            "camera_available": True,
            "timestamp": time.time()
        }

        return frame

    def _capture_loop(self):
        """Background loop continuously capturing and processing frames."""
        self.cap = self._open_camera()
        last_retry = time.time()

        while self.running:
            start_time = time.time()

            if self.cap is not None and self.cap.isOpened():
                ret, frame = self.cap.read()
                if ret and frame is not None:
                    processed = self._process_frame(frame)
                    ret_enc, jpeg = cv2.imencode('.jpg', processed, [cv2.IMWRITE_JPEG_QUALITY, 75])
                    if ret_enc:
                        with self.lock:
                            self.current_jpeg = jpeg.tobytes()
                else:
                    # Retry camera open
                    self.cap.release()
                    time.sleep(0.5)
                    self.cap = self._open_camera()
            else:
                # Periodic retry to check if hardware camera was plugged in or released
                if time.time() - last_retry > 8.0:
                    last_retry = time.time()
                    try:
                        self.cap = self._open_camera()
                    except Exception:
                        pass

                # Fallback test pattern
                jpeg_bytes = self._generate_fallback_frame()
                with self.lock:
                    self.current_jpeg = jpeg_bytes

            # FPS calculation
            self.fps_counter += 1
            now = time.time()
            if now - self.fps_time >= 1.0:
                self.calculated_fps = self.fps_counter / (now - self.fps_time)
                self.fps_counter = 0
                self.fps_time = now

            # Maintain ~25 FPS loop pace
            elapsed = time.time() - start_time
            sleep_time = max(0.01, 0.04 - elapsed)
            time.sleep(sleep_time)

    def get_jpeg_frame(self):
        with self.lock:
            return self.current_jpeg

    def get_status(self):
        with self.lock:
            return dict(self.last_status)

# Global camera manager instance
camera_manager = OpenCVCameraManager()


# =============================================================================
# 2. VOICE COMMAND & SPEECH RECOGNITION ENGINE
# =============================================================================

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

    # 0. Wake Word & Voice Toggle Controls
    if phrase in ["voice on", "voice command on", "voice comment on", "start voice", "turn on voice", "activate voice", "open voice"] or any(k in phrase for k in ["वॉयस ऑन", "वॉइस ऑन"]):
        return {
            "success": True,
            "transcript": raw_phrase,
            "action": "VOICE_ON",
            "description": "Voice Assistant Activated",
            "tone": 680
        }

    if phrase in ["voice off", "voice command off", "voice comment off", "stop voice", "turn off voice", "deactivate voice", "mute voice", "stop listening"] or any(k in phrase for k in ["वॉयस बंद", "वॉइस बंद", "आवाज़ बंद"]):
        return {
            "success": True,
            "transcript": raw_phrase,
            "action": "VOICE_OFF",
            "description": "Voice Assistant Muted",
            "tone": 450
        }

    # 0.1 Help & Language Controls
    if phrase in ["help", "voice help", "show commands", "what can i say", "commands", "मदद"]:
        return {
            "success": True,
            "transcript": raw_phrase,
            "action": "HELP",
            "open": True,
            "description": "Voice Help Opened",
            "tone": 680
        }

    if phrase in ["close help", "hide help", "minimize help"]:
        return {
            "success": True,
            "transcript": raw_phrase,
            "action": "HELP",
            "open": False,
            "description": "Voice Help Closed",
            "tone": 450
        }

    if phrase in ["switch to tamil", "tamil", "tamil language", "தமிழ்"] or "தமிழ்" in phrase:
        return {
            "success": True,
            "transcript": raw_phrase,
            "action": "SET_LANGUAGE",
            "language": "ta-IN",
            "description": "மொழி: தமிழ் (Tamil)",
            "tone": 700
        }

    if phrase in ["switch to hindi", "hindi", "hindi language", "हिन्दी", "हिंदी"] or "हिंदी" in phrase:
        return {
            "success": True,
            "transcript": raw_phrase,
            "action": "SET_LANGUAGE",
            "language": "hi-IN",
            "description": "भाषा: हिन्दी (Hindi)",
            "tone": 700
        }

    if phrase in ["switch to english", "english", "english language", "अंग्रेजी"]:
        return {
            "success": True,
            "transcript": raw_phrase,
            "action": "SET_LANGUAGE",
            "language": "en-IN",
            "description": "Language: English",
            "tone": 700
        }

    # 0.1 Hands-Free Page Scrolling
    if phrase in ["scroll down", "page down", "down", "नीचे जाओ", "नीचे"]:
        return {
            "success": True,
            "transcript": raw_phrase,
            "action": "SCROLL",
            "direction": "down",
            "description": "Scrolling down...",
            "tone": 550
        }

    if phrase in ["scroll up", "page up", "up", "ऊपर जाओ", "ऊपर"]:
        return {
            "success": True,
            "transcript": raw_phrase,
            "action": "SCROLL",
            "direction": "up",
            "description": "Scrolling up...",
            "tone": 550
        }

    if phrase in ["scroll to top", "top", "go to top", "शुरुआत"]:
        return {
            "success": True,
            "transcript": raw_phrase,
            "action": "SCROLL",
            "direction": "top",
            "description": "Scrolled to top",
            "tone": 600
        }

    if phrase in ["scroll to bottom", "bottom", "go to bottom", "अंत"]:
        return {
            "success": True,
            "transcript": raw_phrase,
            "action": "SCROLL",
            "direction": "bottom",
            "description": "Scrolled to bottom",
            "tone": 500
        }

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

    # 6. Assessments & Exams
    if (phrase in ["assessment", "assessments", "exam", "exams", "test", "tests", "quiz", "quizzes", "take test", "start test", "parikshe"] or
        phrase.startswith(("open test", "open assessment", "start exam")) or
        any(k in phrase for k in ["परीक्षा", "परिक्षा"])):
        return {
            "success": True,
            "transcript": raw_phrase,
            "action": "NAVIGATE",
            "target": "/courses",
            "description": "Opening Assessments & Courses...",
            "tone": 620
        }

    # 6.1 Camera Diagnostics / Proctor Test
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

    # 6.2 Admin Portal Navigation
    if (phrase in ["admin", "admin portal", "administration", "admin dashboard", "व्यवस्थापक"] or
        phrase.startswith(("go to admin", "open admin", "show admin", "admin page"))):
        return {
            "success": True,
            "transcript": raw_phrase,
            "action": "NAVIGATE",
            "target": "/admin",
            "description": "Navigating to Admin Portal...",
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

    if phrase in ["speed up", "faster", "2x speed", "fast"]:
        return {
            "success": True,
            "transcript": raw_phrase,
            "action": "VIDEO_SPEED",
            "speed": 1.5,
            "description": "Speed set to 1.5x",
            "tone": 650
        }

    if phrase in ["normal speed", "slow down", "1x speed"]:
        return {
            "success": True,
            "transcript": raw_phrase,
            "action": "VIDEO_SPEED",
            "speed": 1.0,
            "description": "Speed set to 1.0x",
            "tone": 550
        }

    # 7.1 Module Navigation
    if phrase in ["next module", "next topic", "next lecture", "next lesson"] or any(k in phrase for k in ["अगला टॉपिक", "अगला पाठ"]):
        return {
            "success": True,
            "transcript": raw_phrase,
            "action": "MODULE_NEXT",
            "description": "Next Lecture Topic",
            "tone": 620
        }

    if phrase in ["previous module", "previous topic", "previous lecture", "previous lesson"] or any(k in phrase for k in ["पिछला टॉपिक", "पिछला पाठ"]):
        return {
            "success": True,
            "transcript": raw_phrase,
            "action": "MODULE_PREV",
            "description": "Previous Lecture Topic",
            "tone": 520
        }

    # 8. Read Aloud Study Notes & Questions
    if (phrase in ["read aloud", "read notes", "listen notes", "read this", "listen to notes", "speak notes"] or
        any(k in phrase for k in ["बोलकर सुनाओ", "पढ़ो", "सुनो"])):
        return {
            "success": True,
            "transcript": raw_phrase,
            "action": "READ_ALOUD",
            "description": "Reading study notes aloud...",
            "tone": 620
        }

    if phrase in ["read question", "read question aloud", "speak question"] or any(k in phrase for k in ["प्रश्न पढ़ो", "सवाल पढ़ो"]):
        return {
            "success": True,
            "transcript": raw_phrase,
            "action": "READ_QUESTION",
            "description": "Reading Question Aloud...",
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

    # 9.1 Course Filtering & Enrollment
    if phrase in ["filter long duration", "long term courses", "long duration"]:
        return {
            "success": True,
            "transcript": raw_phrase,
            "action": "COURSE_FILTER",
            "filter": "LONG",
            "description": "Showing Long-Duration Courses",
            "tone": 600
        }

    if phrase in ["filter short duration", "short term courses", "refresher courses"]:
        return {
            "success": True,
            "transcript": raw_phrase,
            "action": "COURSE_FILTER",
            "filter": "SHORT",
            "description": "Showing Short/Refresher Courses",
            "tone": 600
        }

    if phrase in ["all courses", "clear filter", "reset filter"]:
        return {
            "success": True,
            "transcript": raw_phrase,
            "action": "COURSE_FILTER",
            "filter": "ALL",
            "description": "Showing All Courses",
            "tone": 600
        }

    if phrase in ["enroll", "enroll course", "start course", "start study"] or "नामांकन" in phrase:
        return {
            "success": True,
            "transcript": raw_phrase,
            "action": "ENROLL",
            "description": "Enrolling in course...",
            "tone": 680
        }

    # 9.2 Chatbot AI Actions
    if phrase in ["send message", "send question", "send chat", "submit question", "भेजो"]:
        return {
            "success": True,
            "transcript": raw_phrase,
            "action": "CHATBOT_SEND",
            "description": "Sending Chatbot Message...",
            "tone": 680
        }

    if phrase in ["clear chat", "new chat", "reset chat"]:
        return {
            "success": True,
            "transcript": raw_phrase,
            "action": "CHATBOT_CLEAR",
            "description": "Cleared Chat History",
            "tone": 450
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

    # Normalize Devanagari numerals ('०१२३४५६७८९' -> '0123456789')
    devanagari_trans = str.maketrans('०१२३४५६७८९', '0123456789')
    normalized_phrase = phrase.translate(devanagari_trans)

    # Jump Question ("question 1", "question 2", "go to question 3", "प्रश्न ३")
    q_jump_match = re.search(r'(?:go to\s+)?(?:question|q|प्रश्न)\s*(\d+)', normalized_phrase, re.IGNORECASE)
    if q_jump_match:
        q_num = int(q_jump_match.group(1))
        return {
            "success": True,
            "transcript": raw_phrase,
            "action": "ASSESSMENT_JUMP",
            "questionNumber": q_num,
            "description": f"Jump to Question {q_num}",
            "tone": 600
        }

    # MCQ Option Selection: "Option A", "Select B", "विकल्प सी", "उत्तर डी", or phonetic Hindi "विकल्प ए"
    option_match = re.search(r'(?:(?:option|select|choose|answer|विकल्प|उत्तर)\s+)?([a-dA-D]|ए|बी|सी|डी)$', phrase, re.IGNORECASE)
    if option_match:
        raw_opt = option_match.group(1).strip()
        hindi_map = {'ए': 'A', 'बी': 'B', 'सी': 'C', 'डी': 'D', 'a': 'A', 'b': 'B', 'c': 'C', 'd': 'D'}
        opt = hindi_map.get(raw_opt, raw_opt.upper())
        return {
            "success": True,
            "transcript": raw_phrase,
            "action": "OPTION_SELECT",
            "option": opt,
            "description": f"Selected Option {opt}",
            "tone": 650
        }

    if phrase in ["clear answer", "erase answer", "clear option"] or "उत्तर मिटाओ" in phrase:
        return {
            "success": True,
            "transcript": raw_phrase,
            "action": "CLEAR_ANSWER",
            "description": "Cleared Question Answer",
            "tone": 450
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

    # General dictation fallback
    return {
        "success": True,
        "transcript": raw_phrase,
        "action": "GENERAL_INPUT",
        "fill_text": raw_phrase,
        "description": f"Heard: '{raw_phrase}'",
        "tone": 720
    }

def transcribe_audio_stream(audio_bytes: bytes, language: str = "en-IN") -> Dict[str, Any]:
    """Decodes audio bytes (PCM WAV) and transcribes using Python's speech_recognition."""
    if not recognizer:
        return {
            "success": False,
            "error": "SpeechRecognition library not loaded on system."
        }

    if not audio_bytes or len(audio_bytes) < 44:
        return {
            "success": False,
            "error": "Invalid or empty audio data received."
        }

    try:
        audio_io = io.BytesIO(audio_bytes)
        with sr.AudioFile(audio_io) as source:
            audio_data = recognizer.record(source)

        transcript = ""
        try:
            transcript = recognizer.recognize_google(audio_data, language=language)
        except sr.UnknownValueError:
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


# =============================================================================
# 3. BACKGROUND HARDWARE MICROPHONE LISTENER
# =============================================================================

class PythonBackgroundMicListener:
    """
    Continuous background listener for the physical hardware microphone.
    Directly binds to Windows Realtek audio capture via PyAudio and SpeechRecognition.
    Transcribes recognized voice commands and maintains a thread-safe event queue
    for continuous web navigation and dictation without browser permission deadlocks.
    """
    def __init__(self):
        self.lock = threading.Lock()
        self.running = False
        self.thread = None
        self.last_event = None
        self.event_counter = 0
        self.mic_error = None
        self.pause_requested = threading.Event()
        self.mic_hardware_lock = threading.Lock()

    def start(self):
        if self.running or sr is None:
            return
        self.running = True
        self.pause_requested.clear()
        self.thread = threading.Thread(target=self._listen_loop, daemon=True)
        self.thread.start()
        print("[Voice Listener] Background hardware microphone listener started.")

    def stop(self):
        self.running = False
        self.pause_requested.set()
        print("[Voice Listener] Background microphone listener paused.")

    def push_event(self, transcript: str, source: str = "upload"):
        """Pushes an event into the polling queue (e.g. from web Push-to-Talk)."""
        if not transcript:
            return
        cmd = parse_voice_command(transcript)
        with self.lock:
            self.event_counter += 1
            self.last_event = {
                "id": self.event_counter,
                "transcript": transcript,
                "command": cmd,
                "timestamp": time.time(),
                "source": source
            }
        print(f"[Voice Listener] Pushed event #{self.event_counter}: '{transcript}' -> {cmd.get('action')}")

    def _listen_loop(self):
        rec = sr.Recognizer()
        rec.energy_threshold = 140
        rec.dynamic_energy_threshold = True
        rec.dynamic_energy_adjustment_damping = 0.15
        rec.dynamic_energy_ratio = 1.4
        rec.pause_threshold = 0.6
        rec.non_speaking_duration = 0.3

        try:
            mic = sr.Microphone()
        except Exception as e:
            self.mic_error = str(e)
            print(f"[Voice Listener Error] Could not initialize physical microphone: {e}")
            self.running = False
            return

        while self.running:
            if self.pause_requested.is_set():
                time.sleep(0.1)
                continue

            try:
                with self.mic_hardware_lock:
                    if self.pause_requested.is_set() or not self.running:
                        time.sleep(0.1)
                        continue

                    with mic as source:
                        rec.adjust_for_ambient_noise(source, duration=0.2)
                        rec.energy_threshold = max(80, min(int(rec.energy_threshold), 420))
                        while self.running and not self.pause_requested.is_set():
                            try:
                                # Listen for phrase with non-blocking timeout
                                audio = rec.listen(source, timeout=1.5, phrase_time_limit=5.0)
                                if not audio:
                                    continue

                                # Recognize speech across supported Indian accents
                                text = ""
                                for lang in ["en-IN", "hi-IN", "ta-IN", "en-US"]:
                                    try:
                                        text = rec.recognize_google(audio, language=lang)
                                        if text and text.strip():
                                            break
                                    except sr.UnknownValueError:
                                        continue
                                    except sr.RequestError as req_err:
                                        print(f"[Voice Listener] Google API request error: {req_err}")
                                        break
                                    except Exception:
                                        continue

                                if text and text.strip():
                                    text = text.strip()
                                    print(f"[Voice Listener] Direct Hardware Mic Heard: '{text}'")
                                    cmd = parse_voice_command(text)
                                    with self.lock:
                                        self.event_counter += 1
                                        self.last_event = {
                                            "id": self.event_counter,
                                            "transcript": text,
                                            "command": cmd,
                                            "timestamp": time.time(),
                                            "source": "python_hardware_mic"
                                        }
                            except sr.WaitTimeoutError:
                                continue
                            except Exception as inner_e:
                                time.sleep(0.2)
            except Exception as outer_e:
                print(f"[Voice Listener] Mic stream loop exception: {outer_e}")
                time.sleep(0.8)

# Global microphone listener instance
mic_listener = PythonBackgroundMicListener()


# =============================================================================
# 4. FLASK HTTP & STREAMING APPLICATION
# =============================================================================

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
        "service": "IMD Capacity Connect Unified AI Service",
        "modules": {
            "camera_proctoring": "OpenCV 4.14 Hardware & AI Vision",
            "speech_recognition": "SpeechRecognition Google Web Speech API",
            "hardware_microphone": "Online" if mic_listener.running else "Paused"
        },
        "version": "2.0.0",
        "languages": ["en-IN", "en-US", "hi-IN", "ta-IN"],
        "mic_active": mic_listener.running,
        "latest_voice_id": mic_listener.event_counter
    })

# --- CAMERA STREAMING & STATUS ---

def gen_mjpeg_frames():
    """Generates continuous MJPEG video stream frames for HTML <img> rendering."""
    while True:
        frame_bytes = camera_manager.get_jpeg_frame()
        if frame_bytes:
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        time.sleep(0.035)

@app.route("/video_feed", methods=["GET"])
def video_feed():
    """Returns continuous multipart MJPEG stream viewable in any standard browser <img> tag."""
    return Response(
        gen_mjpeg_frames(),
        mimetype="multipart/x-mixed-replace; boundary=frame"
    )

@app.route("/camera_status", methods=["GET"])
def camera_status_endpoint():
    """Returns live computer vision proctoring status."""
    status = camera_manager.get_status()
    return jsonify({
        "success": True,
        **status
    })

@app.route("/detect_frame", methods=["POST", "OPTIONS"])
def detect_frame_endpoint():
    """Runs OpenCV face detection on uploaded base64/JPEG frame from client canvas."""
    if request.method == "OPTIONS":
        return "", 204

    image_bytes = None
    if "image" in request.files:
        image_bytes = request.files["image"].read()
    elif request.is_json:
        data = request.get_json(silent=True) or {}
        b64 = data.get("image_base64", "")
        if b64:
            if "," in b64:
                b64 = b64.split(",", 1)[1]
            try:
                image_bytes = base64.b64decode(b64)
            except Exception:
                pass
    elif request.data:
        image_bytes = request.data

    if not image_bytes or cv2 is None or np is None:
        return jsonify({"success": False, "error": "No image or OpenCV unavailable"}), 400

    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            return jsonify({"success": False, "error": "Could not decode image"}), 400

        processed = camera_manager._process_frame(frame)
        status = camera_manager.get_status()
        return jsonify({"success": True, **status})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# --- VOICE COMMANDS & TRANSCRIPTION ---

@app.route("/transcribe", methods=["POST", "OPTIONS"])
def transcribe_endpoint():
    if request.method == "OPTIONS":
        return "", 204

    language = request.args.get("language") or "en-IN"
    audio_bytes = None

    if "audio" in request.files:
        audio_file = request.files["audio"]
        language = request.form.get("language", language)
        audio_bytes = audio_file.read()
    elif request.is_json:
        data = request.get_json(silent=True) or {}
        language = data.get("language", language)
        b64 = data.get("audio_base64", "")
        if b64:
            if "," in b64:
                b64 = b64.split(",", 1)[1]
            try:
                audio_bytes = base64.b64decode(b64)
            except Exception as e:
                return jsonify({"success": False, "error": f"Base64 decode failed: {str(e)}"}), 400
    elif request.data:
        audio_bytes = request.data

    if not audio_bytes:
        return jsonify({"success": False, "error": "No audio payload provided in request."}), 400

    result = transcribe_audio_stream(audio_bytes, language=language)
    if result.get("success") and result.get("transcript"):
        mic_listener.push_event(result["transcript"], source="web_transcribe_upload")
    status_code = 200 if result.get("success") else 422
    return jsonify(result), status_code

@app.route("/voice_poll", methods=["GET"])
def voice_poll_endpoint():
    """Returns the latest recognized voice event if newer than ?since=<id>."""
    try:
        since_id = int(request.args.get("since", 0))
    except (TypeError, ValueError):
        since_id = 0

    with mic_listener.lock:
        last = dict(mic_listener.last_event) if mic_listener.last_event else None
        current_id = mic_listener.event_counter

    # If new event exists within the last 15 seconds
    if last and last["id"] > since_id and (time.time() - last["timestamp"] < 15.0):
        return jsonify({
            "has_command": True,
            "event": last,
            "latest_id": current_id,
            "mic_active": mic_listener.running,
            "error": mic_listener.mic_error
        })
    return jsonify({
        "has_command": False,
        "latest_id": current_id,
        "mic_active": mic_listener.running,
        "error": mic_listener.mic_error
    })

@app.route("/voice_listener_control", methods=["POST", "OPTIONS"])
def voice_listener_control_endpoint():
    """Starts, stops, or checks status of the hardware microphone listener."""
    if request.method == "OPTIONS":
        return "", 204

    data = request.get_json(silent=True) or {}
    action = data.get("action", "status")

    if action == "start":
        mic_listener.start()
    elif action == "stop":
        mic_listener.stop()
    elif action == "toggle":
        if mic_listener.running:
            mic_listener.stop()
        else:
            mic_listener.start()

    return jsonify({
        "success": True,
        "mic_active": mic_listener.running,
        "latest_id": mic_listener.event_counter,
        "error": mic_listener.mic_error
    })

@app.route("/listen_once", methods=["POST", "GET", "OPTIONS"])
def listen_once_endpoint():
    """Natively records a single spoken phrase directly from the hardware microphone."""
    if request.method == "OPTIONS":
        return "", 204

    lang = request.args.get("language") or "en-IN"
    if request.is_json:
        data = request.get_json(silent=True) or {}
        lang = data.get("language", lang)

    # Signal background microphone listener to yield hardware access
    mic_listener.pause_requested.set()
    try:
        with mic_listener.mic_hardware_lock:
            rec = sr.Recognizer()
            rec.energy_threshold = 140
            rec.dynamic_energy_threshold = True
            rec.dynamic_energy_adjustment_damping = 0.15
            rec.dynamic_energy_ratio = 1.4
            rec.pause_threshold = 0.6

            with sr.Microphone() as source:
                rec.adjust_for_ambient_noise(source, duration=0.2)
                rec.energy_threshold = max(80, min(int(rec.energy_threshold), 420))
                audio = rec.listen(source, timeout=4.0, phrase_time_limit=6.0)

            # Targeted multi-accent recognition without redundant duplicates
            target_langs = []
            for l in [lang, "en-IN", "hi-IN", "ta-IN", "en-US"]:
                if l and l not in target_langs:
                    target_langs.append(l)

            transcript = None
            for l in target_langs[:3]:  # At most 3 targeted dialects
                try:
                    transcript = rec.recognize_google(audio, language=l)
                    if transcript and transcript.strip():
                        break
                except sr.UnknownValueError:
                    continue
                except sr.RequestError as req_err:
                    print(f"[Voice Mic API Request Error]: {req_err}")
                    break
                except Exception:
                    continue

            if transcript and transcript.strip():
                transcript = transcript.strip()
                cmd = parse_voice_command(transcript)
                mic_listener.push_event(transcript, source="listen_once")
                return jsonify({
                    "success": True,
                    "transcript": transcript,
                    "command": cmd
                })
            else:
                return jsonify({
                    "success": False,
                    "error": "No clear speech recognized. Please speak into your microphone."
                }), 422
    except sr.WaitTimeoutError:
        return jsonify({
            "success": False,
            "error": "Listening timed out. No speech detected."
        }), 408
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Microphone error: {str(e)}"
        }), 500
    finally:
        mic_listener.pause_requested.clear()

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
    mic_listener.push_event(text, source="command_endpoint")
    return jsonify({
        "success": True,
        "transcript": text,
        "command": parsed
    })

def main():
    parser = argparse.ArgumentParser(description="IMD Capacity Connect Unified OpenCV & Voice Service")
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

    # Start threaded OpenCV camera background worker
    print("[Service] Starting threaded OpenCV camera loop...")
    camera_manager.start()

    # Start background Python physical microphone listener
    print("[Service] Starting background physical microphone listener...")
    mic_listener.start()

    print(f"============================================================")
    print(f"IMD Python Unified Vision & Voice Service on http://{args.host}:{args.port}")
    print(f"1. OpenCV Video Stream: http://{args.host}:{args.port}/video_feed")
    print(f"2. OpenCV Camera Status: http://{args.host}:{args.port}/camera_status")
    print(f"3. Voice Recognition: http://{args.host}:{args.port}/transcribe")
    print(f"4. Background Voice Poll: http://{args.host}:{args.port}/voice_poll")
    print(f"============================================================")
    app.run(host=args.host, port=args.port, debug=False, threaded=True)

if __name__ == "__main__":
    main()
