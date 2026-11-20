import os
from typing import Dict, Iterable, Tuple

import cv2
import numpy as np


def _float_env(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, str(default)))
    except ValueError:
        return default


def mask_metrics(mask: np.ndarray, probability: np.ndarray) -> Dict[str, object]:
    mask_binary = np.asarray(mask) > 0
    probability = np.asarray(probability, dtype=np.float32)
    pixel_count = int(np.count_nonzero(mask_binary))
    total_pixels = int(mask_binary.size)
    pixel_percentage = float(pixel_count / total_pixels) if total_pixels else 0.0

    binary_uint8 = mask_binary.astype(np.uint8)
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(binary_uint8, connectivity=8)
    largest_component = int(max(stats[1:, cv2.CC_STAT_AREA], default=0)) if num_labels > 1 else 0

    foreground_probability = (
        float(np.mean(probability[mask_binary]))
        if pixel_count
        else 0.0
    )

    return {
        "pixel_count": pixel_count,
        "pixel_percentage": pixel_percentage,
        "largest_component": largest_component,
        "foreground_probability": foreground_probability,
    }


def sequence_temporal_change(frame_masks: Iterable[np.ndarray]) -> bool:
    masks = [np.asarray(mask) > 0 for mask in frame_masks]
    if len(masks) < 2:
        return False

    ious = []
    area_changes = []
    for previous, current in zip(masks, masks[1:]):
        intersection = int(np.count_nonzero(previous & current))
        union = int(np.count_nonzero(previous | current))
        ious.append(intersection / union if union else 1.0)

        previous_area = int(np.count_nonzero(previous))
        current_area = int(np.count_nonzero(current))
        area_changes.append(
            abs(current_area - previous_area) / previous_area
            if previous_area
            else (1.0 if current_area else 0.0)
        )

    return (1.0 - min(ious)) >= 0.02 or max(area_changes, default=0.0) >= 0.02


def decide_fire_status(
    frame_masks: Iterable[np.ndarray],
    frame_probabilities: Iterable[np.ndarray],
    future_mask: np.ndarray,
    future_probability: np.ndarray,
) -> Tuple[str, str, Dict[str, object]]:
    frame_masks = list(frame_masks)
    frame_probabilities = list(frame_probabilities)

    current_mask = frame_masks[-1]
    current_probability = frame_probabilities[-1]
    current = mask_metrics(current_mask, current_probability)
    future = mask_metrics(future_mask, future_probability)

    frame_metrics = [
        mask_metrics(mask, probability)
        for mask, probability in zip(frame_masks, frame_probabilities)
    ]

    no_fire_pixel_percentage = _float_env("FIRE_NO_FIRE_PIXEL_PERCENTAGE", 0.002)
    no_fire_component_pixels = int(_float_env("FIRE_NO_FIRE_COMPONENT_PIXELS", 64))
    fire_pixel_percentage = _float_env("FIRE_PIXEL_PERCENTAGE", 0.005)
    fire_component_pixels = int(_float_env("FIRE_COMPONENT_PIXELS", 256))
    foreground_probability = _float_env("FIRE_FOREGROUND_PROBABILITY", 0.55)
    minimum_fire_frames = int(_float_env("FIRE_MINIMUM_FIRE_FRAMES", 2))
    future_pixel_percentage = _float_env("FIRE_FUTURE_PIXEL_PERCENTAGE", 0.002)
    future_component_pixels = int(_float_env("FIRE_FUTURE_COMPONENT_PIXELS", 64))

    def is_strong(metrics: Dict[str, object]) -> bool:
        return (
            float(metrics["pixel_percentage"]) >= fire_pixel_percentage
            and int(metrics["largest_component"]) >= fire_component_pixels
            and float(metrics["foreground_probability"]) >= foreground_probability
        )

    def is_present(metrics: Dict[str, object]) -> bool:
        return (
            float(metrics["pixel_percentage"]) >= no_fire_pixel_percentage
            and int(metrics["largest_component"]) >= no_fire_component_pixels
        )

    strong_frames = sum(is_strong(metrics) for metrics in frame_metrics)
    present_frames = sum(is_present(metrics) for metrics in frame_metrics)
    temporal_change = sequence_temporal_change(frame_masks)
    current_strong = is_strong(current)
    future_strong = (
        float(future["pixel_percentage"]) >= future_pixel_percentage
        and int(future["largest_component"]) >= future_component_pixels
        and float(future["foreground_probability"]) >= foreground_probability
    )
    current_present = is_present(current)

    if not present_frames and not is_present(future):
        status = "NO FIRE DETECTED"
        status_code = "NO_FIRE"
    elif (
        strong_frames >= minimum_fire_frames
        and (current_strong or present_frames >= minimum_fire_frames)
        and future_strong
        and temporal_change
    ):
        status = "FIRE DETECTED"
        status_code = "FIRE"
    elif (
        present_frames
        or current_present
        or is_present(future)
        or current_strong
        or future_strong
    ):
        status = "UNCERTAIN — MANUAL VERIFICATION REQUIRED"
        status_code = "UNCERTAIN"
    else:
        status = "NO FIRE DETECTED"
        status_code = "NO_FIRE"

    details = {
        "fire_status": status,
        "fire_status_code": status_code,
        "current_fire_percentage": current["pixel_percentage"] * 100.0,
        "future_fire_percentage": future["pixel_percentage"] * 100.0,
        "largest_current_component": current["largest_component"],
        "largest_future_component": future["largest_component"],
        "strong_fire_frames": strong_frames,
        "present_fire_frames": present_frames,
        "temporal_change_detected": temporal_change,
        "frame_metrics": [
            {
                "pixel_count": int(metrics["pixel_count"]),
                "pixel_percentage": float(metrics["pixel_percentage"]) * 100.0,
                "largest_component": int(metrics["largest_component"]),
                "foreground_probability": float(metrics["foreground_probability"]),
            }
            for metrics in frame_metrics
        ],
    }
    return status, status_code, details
