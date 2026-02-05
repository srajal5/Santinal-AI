"""
YOLOv8 inference helper for Sentinel backend.

Loads the combined Violence + Accident model once and exposes a simple
API to run detection on a video file. We aggregate detections of:
- class 1 = Violence
- class 2 = Accident

Returned detections are high-level events suitable for creating incidents.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any, Dict, List

import cv2
import numpy as np
from ultralytics import YOLO

logger = logging.getLogger(__name__)

# Limit OpenMP threads in case this runs alongside FastAPI workers
os.environ.setdefault("OMP_NUM_THREADS", "1")


ROOT_DIR = Path(__file__).resolve().parents[2]  # .../backend
MODEL_DIR = ROOT_DIR / "model"
BEST_WEIGHTS = MODEL_DIR / "runs" / "detect" / "train_combined" / "weights" / "best.pt"

_model: YOLO | None = None


def get_model() -> YOLO:
    """
    Lazily load and cache the YOLO model.
    """
    global _model
    if _model is None:
        if not BEST_WEIGHTS.exists():
            logger.error(f"YOLO weights not found at {BEST_WEIGHTS}")
            raise FileNotFoundError(f"YOLO weights not found at {BEST_WEIGHTS}")
        logger.info(f"Loading YOLO model from {BEST_WEIGHTS}")
        try:
            _model = YOLO(str(BEST_WEIGHTS))
            logger.info("YOLO model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load YOLO model: {e}")
            raise
    return _model


def run_video_detection(
    video_path: str | Path,
    frame_stride: int = 5,
    conf: float = 0.5,
) -> List[Dict[str, Any]]:
    """
    Run YOLOv8 on a video file and return a list of high-level detection events.

    Each event is a dict with:
      - type: "violence" or "accident"
      - frame_index: int
      - timestamp_sec: float
      - box_count: int
      - max_conf: float
    """
    path = Path(video_path)
    if not path.exists():
        logger.error(f"Video file not found: {path}")
        raise FileNotFoundError(f"Video file not found: {path}")

    logger.info(f"Starting video detection on {path}")
    
    try:
        model = get_model()
    except Exception as e:
        logger.error(f"Failed to get YOLO model: {e}")
        raise

    cap = cv2.VideoCapture(str(path))
    if not cap.isOpened():
        logger.error(f"Could not open video: {path}")
        raise RuntimeError(f"Could not open video: {path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    total_frames = cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0
    logger.info(f"Video info: FPS={fps}, Total frames={total_frames}")
    
    events: List[Dict[str, Any]] = []
    processed_frames = 0

    frame_idx = 0
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % frame_stride != 0:
                frame_idx += 1
                continue

            # Ensure frame is in expected format (numpy array, BGR)
            if frame is None or not isinstance(frame, np.ndarray):
                frame_idx += 1
                continue

            processed_frames += 1
            
            try:
                results = model(frame, conf=conf, verbose=False)[0]
            except Exception as e:
                logger.warning(f"Inference failed on frame {frame_idx}: {e}")
                frame_idx += 1
                continue

            violence_confs: List[float] = []
            accident_confs: List[float] = []

            if results.boxes is not None:
                for box in results.boxes:
                    cls_id = int(box.cls[0])
                    score = float(box.conf[0]) if hasattr(box, "conf") else conf
                    if cls_id == 1:
                        violence_confs.append(score)
                    elif cls_id == 2:
                        accident_confs.append(score)

            timestamp = frame_idx / fps

            if violence_confs:
                events.append(
                    {
                        "type": "violence",
                        "frame_index": frame_idx,
                        "timestamp_sec": timestamp,
                        "box_count": len(violence_confs),
                        "max_conf": max(violence_confs),
                    }
                )

            if accident_confs:
                events.append(
                    {
                        "type": "accident",
                        "frame_index": frame_idx,
                        "timestamp_sec": timestamp,
                        "box_count": len(accident_confs),
                        "max_conf": max(accident_confs),
                    }
                )

            frame_idx += 1
    finally:
        cap.release()

    logger.info(f"Video detection completed: {processed_frames} frames processed, {len(events)} events detected")
    return events


def run_frame_detection(
    frame: np.ndarray,
    conf: float = 0.5,
) -> List[Dict[str, Any]]:
    """
    Run YOLOv8 on a single frame and return detection results.
    
    This is designed for real-time webcam detection.
    
    Returns a list of detections with:
      - type: "violence" or "accident"
      - bbox: [x1, y1, x2, y2] bounding box coordinates
      - confidence: float confidence score
    """
    model = get_model()
    
    if frame is None or not isinstance(frame, np.ndarray):
        return []
    
    try:
        results = model(frame, conf=conf, verbose=False)[0]
    except Exception as e:
        logger.warning(f"Frame inference failed: {e}")
        return []
    
    detections: List[Dict[str, Any]] = []
    
    if results.boxes is not None:
        for box in results.boxes:
            cls_id = int(box.cls[0])
            score = float(box.conf[0]) if hasattr(box, "conf") else conf
            
            if cls_id == 1:  # Violence
                detections.append({
                    "type": "violence",
                    "bbox": box.xyxy[0].tolist(),
                    "confidence": score,
                })
            elif cls_id == 2:  # Accident
                detections.append({
                    "type": "accident",
                    "bbox": box.xyxy[0].tolist(),
                    "confidence": score,
                })
    
    return detections

