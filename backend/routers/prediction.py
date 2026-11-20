import os
import glob
import logging
import pandas as pd
from pathlib import Path
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from ..utils.preprocessing import ImagePreprocessor
from ..services.unet_service import UNetService
from ..services.convlstm_service import ConvLSTMService
from ..services.analytics import Analytics
from ..services.predictor import Predictor

router = APIRouter(prefix="/predict", tags=["prediction"])
logger = logging.getLogger(__name__)
PROJECT_ROOT = Path(__file__).resolve().parents[2]
SAMPLE_DATA_DIR = PROJECT_ROOT / "sample_data"
UPLOADS_DIR = PROJECT_ROOT / "uploads"
UNET_MODEL_PATH = PROJECT_ROOT / "models" / "unet_fire_segmentation_final.pth"
CONVLSTM_MODEL_PATH = PROJECT_ROOT / "models" / "future_fire_prediction.pth"

class PredictionRequest(BaseModel):
    sequence: Optional[str] = None

# Lazy load the predictor to avoid loading models on import
_predictor_instance = None

def get_predictor() -> Predictor:
    global _predictor_instance
    if _predictor_instance is None:
        try:
            if not UNET_MODEL_PATH.is_file() or not CONVLSTM_MODEL_PATH.is_file():
                logger.error("Required prediction model weights are unavailable.")
                raise HTTPException(
                    status_code=503,
                    detail="Prediction models are unavailable. Check that the required model files are installed.",
                )

            missing_lfs_weights = [
                model_path.name
                for model_path in (UNET_MODEL_PATH, CONVLSTM_MODEL_PATH)
                if model_path.read_bytes().startswith(b"version https://git-lfs.github.com/spec/v1")
            ]
            if missing_lfs_weights:
                logger.error(
                    "Required prediction model weights are Git LFS pointers, not downloaded checkpoint files: %s",
                    ", ".join(missing_lfs_weights),
                )
                raise HTTPException(
                    status_code=503,
                    detail="Prediction model weights are missing. Download the Git LFS model files and restart the backend.",
                )

            preprocessor = ImagePreprocessor()

            unet_service = UNetService(str(UNET_MODEL_PATH))
            unet_service.load_model()

            convlstm_service = ConvLSTMService(str(CONVLSTM_MODEL_PATH))
            convlstm_service.load_model()


            analytics = Analytics()

            _predictor_instance = Predictor(
                preprocessor=preprocessor,
                unet_service=unet_service,
                convlstm_service=convlstm_service,
                analytics=analytics
            )
        except HTTPException:
            raise
        except Exception:
            logger.exception("Failed to initialize prediction models.")
            raise HTTPException(
                status_code=503,
                detail="Prediction models could not be initialized. Check the backend logs.",
            )

    return _predictor_instance

@router.post("")
def predict(request: PredictionRequest, predictor: Predictor = Depends(get_predictor)):
    if request.sequence:
        if Path(request.sequence).name != request.sequence:
            raise HTTPException(status_code=400, detail="Invalid sample sequence name.")
        folder_path = SAMPLE_DATA_DIR / request.sequence
    else:
        folder_path = UPLOADS_DIR

    if not folder_path.is_dir():
        raise HTTPException(status_code=404, detail="The selected image sequence was not found.")

    # Gather TIFF files and deduplicate entries. On Windows, .TIFF and .tiff may resolve to the same files.
    patterns = [
    "*.TIFF", "*.tiff", "*.TIF", "*.tif",
    "*.JPG", "*.jpg", "*.JPEG", "*.jpeg"]
    tiff_files = sorted({
        match
        for pattern in patterns
        for match in glob.glob(str(folder_path / pattern))
    })

    # Check if we have exactly 5 files
    if len(tiff_files) == 0:
        raise HTTPException(status_code=404, detail="No TIFF, JPG, or JPEG images were found in the selected sequence.")
    elif len(tiff_files) != 5:
        raise HTTPException(status_code=400, detail=f"Expected exactly 5 images, found {len(tiff_files)}.")

    try:
        prediction = predictor.predict(tiff_files)
    except ValueError as exc:
        logger.info("Invalid prediction input: %s", exc)
        raise HTTPException(status_code=422, detail="One or more input images are invalid or unreadable.") from exc
    except Exception as exc:
        logger.exception("Prediction inference failed.")
        raise HTTPException(
            status_code=500,
            detail="Prediction failed during image processing or model inference. Check backend logs.",
        ) from exc

    response = {
        "status": "success",
        **prediction,
    }

    return response
