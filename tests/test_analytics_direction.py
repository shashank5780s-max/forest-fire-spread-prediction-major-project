import unittest

import numpy as np

from backend.services.analytics import Analytics
from backend.utils.fire_decision import decide_fire_status


class AnalyticsDirectionTests(unittest.TestCase):
    def test_image_relative_bearing_uses_north_clockwise_orientation(self):
        analytics = Analytics()
        current = np.zeros((256, 256), dtype=np.uint8)
        future = np.zeros((256, 256), dtype=np.uint8)

        current[120:140, 120:140] = 1
        future[100:120, 120:140] = 1

        distance, bearing = analytics.calculate_spread_distance_and_direction(current, future)

        self.assertGreater(distance, 0)
        self.assertTrue((0 <= bearing <= 10) or (350 <= bearing <= 360))

    def test_empty_masks_return_no_direction(self):
        analytics = Analytics()
        empty = np.zeros((32, 32), dtype=np.uint8)

        distance, bearing = analytics.calculate_spread_distance_and_direction(empty, empty)

        self.assertEqual(distance, 0.0)
        self.assertEqual(bearing, 0.0)

    def test_all_zero_sequence_is_no_fire(self):
        zero_mask = np.zeros((256, 256), dtype=np.uint8)
        zero_probability = np.zeros((256, 256), dtype=np.float32)

        _, status_code, details = decide_fire_status(
            [zero_mask] * 5,
            [zero_probability] * 5,
            zero_mask,
            zero_probability,
        )

        self.assertEqual(status_code, "NO_FIRE")
        self.assertEqual(details["future_fire_percentage"], 0.0)

    def test_repeated_small_region_is_uncertain_or_fire_not_no_fire(self):
        mask = np.zeros((256, 256), dtype=np.uint8)
        mask[120:136, 120:136] = 1
        probability = np.full((256, 256), 0.1, dtype=np.float32)
        probability[mask > 0] = 0.8

        _, status_code, _ = decide_fire_status(
            [mask] * 5,
            [probability] * 5,
            mask,
            probability,
        )

        self.assertNotEqual(status_code, "NO_FIRE")

    def test_large_persistent_region_is_fire(self):
        frames = []
        probability = np.full((256, 256), 0.1, dtype=np.float32)
        for offset in range(5):
            mask = np.zeros((256, 256), dtype=np.uint8)
            mask[80 + offset * 2:176 + offset * 2, 80:176] = 1
            frames.append(mask)
            probability[mask > 0] = 0.9

        mask = frames[-1]
        probability = np.full((256, 256), 0.1, dtype=np.float32)
        probability[mask > 0] = 0.9

        status, status_code, _ = decide_fire_status(
            frames,
            [probability] * 5,
            mask,
            probability,
        )

        self.assertEqual(status_code, "FIRE")
        self.assertEqual(status, "FIRE DETECTED")


if __name__ == "__main__":
    unittest.main()
