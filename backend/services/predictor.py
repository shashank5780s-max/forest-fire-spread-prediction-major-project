import os
import logging
import uuid
from pathlib import Path
import numpy as np
import pandas as pd
from typing import List

from ..utils.preprocessing import ImagePreprocessor
from ..utils.visualization import Visualizer
from ..services.unet_service import UNetService
from ..services.convlstm_service import ConvLSTMService
from ..services.analytics import Analytics
from ..schemas.response import PredictionResponse
from ..utils.fire_decision import decide_fire_status

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
PROJECT_ROOT = Path(__file__).resolve().parents[2]
OUTPUTS_DIR = PROJECT_ROOT / "outputs"

class Predictor:
    def __init__(self, 
                 preprocessor: ImagePreprocessor,
                 unet_service: UNetService,
                 convlstm_service: ConvLSTMService,
                 analytics: Analytics):
        self.preprocessor = preprocessor
        self.unet_service = unet_service
        self.convlstm_service = convlstm_service
        self.analytics = analytics

    def predict(self, sequence_paths: List[str]) -> PredictionResponse:
        try:
            if len(sequence_paths) != 5:
                raise ValueError(f"Expected exactly 5 image paths, got {len(sequence_paths)}")

            logger.info("Starting prediction pipeline for 5 thermal images.")

            thermal_images = []
            fire_masks = []
            frame_probabilities = []

            for path in sequence_paths:
                logger.info(f"Processing image: {path}")
                img, tensor = self.preprocessor.preprocess(path)
                thermal_images.append(img)

                prob_map, mask = self.unet_service.predict(tensor)
                mask_np = mask.squeeze().cpu().numpy()
                prob_np = prob_map.squeeze().cpu().numpy()
                fire_masks.append(mask_np)
                frame_probabilities.append(prob_np)

            logger.info("Running ConvLSTM for future fire prediction.")
            run_id = uuid.uuid4().hex
            run_output_dir = OUTPUTS_DIR / run_id
            run_output_dir.mkdir(parents=True, exist_ok=False)
            prediction_np, future_mask = self.convlstm_service.predict(fire_masks, thermal_images, output_dir=run_output_dir)

            current_mask = fire_masks[-1]
            logger.info("Calculating fire statistics.")
            analytics_result = self.analytics.analyze(current_mask, future_mask, prediction_np)
            fire_status, fire_status_code, fire_decision = decide_fire_status(
                fire_masks,
                frame_probabilities,
                future_mask,
                prediction_np,
            )
            if fire_status_code == "NO_FIRE":
                analytics_result.risk_category = "Low"
                analytics_result.risk_score = 0.0

            OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
            visualizer = Visualizer(output_dir=str(run_output_dir))
            generated = visualizer.generate_visualizations(
                thermal_img=thermal_images[-1],
                current_mask=current_mask,
                future_mask=future_mask,
                prob_map=prediction_np,
                analytics=analytics_result,
            )
            output_paths = {
                key: f"/outputs/{run_id}/{Path(path).name}"
                for key, path in generated.items()
            }

            logger.info("Saving final prediction results to CSV.")
            OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
            results_df = pd.DataFrame([{
                "area": analytics_result.current_area,
                "distance": analytics_result.spread_distance,
                "speed": analytics_result.spread_speed,
                "direction": analytics_result.spread_direction,
                "risk": analytics_result.risk_category,
                "risk_score": analytics_result.risk_score,
                "current_fire_area": analytics_result.current_area,
                "future_fire_area": analytics_result.future_area,
                "growth_percentage": analytics_result.growth_percentage,
                "confidence": analytics_result.confidence,
                "fire_status": fire_status,
                "fire_status_code": fire_status_code,
            }])
            results_df.to_csv(OUTPUTS_DIR / "prediction_results.csv", index=False)
            results_df.to_csv(run_output_dir / "prediction_results.csv", index=False)

            logger.info("Prediction pipeline completed successfully.")

            return {
                "current_fire_mask": output_paths["current_fire_mask"],
                "predicted_future_fire": output_paths["predicted_future_fire"],
                "future_fire_overlay": output_paths["future_fire_overlay"],
                "fire_probability_heatmap": output_paths["fire_probability_heatmap"],
                "difference_map": output_paths["difference_map"],
                "fire_boundary": output_paths["fire_boundary"],
                "fire_direction": output_paths["fire_direction"],
                "risk_dashboard": output_paths["risk_dashboard"],
                "analytics": {
                    "current_fire_area": analytics_result.current_area,
                    "future_fire_area": analytics_result.future_area,
                    "growth_percentage": analytics_result.growth_percentage,
                    "spread_distance": analytics_result.spread_distance,
                    "spread_speed": analytics_result.spread_speed,
                    "spread_direction": analytics_result.spread_direction,
                    "confidence": analytics_result.confidence,
                    "risk": analytics_result.risk_category,
                    "risk_score": analytics_result.risk_score,
                    "fire_status": fire_status,
                    "fire_status_code": fire_status_code,
                    **fire_decision,
                },
                "generated_files": output_paths,
            }

        except Exception as e:
            logger.error(f"Error during prediction pipeline: {str(e)}", exc_info=True)
            raise e
