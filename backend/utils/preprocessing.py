import os
import numpy as np
import cv2
import rasterio
import torch
from PIL import Image

class ImagePreprocessor:
    def __init__(self, image_size=256):
        self.image_size = image_size

    def preprocess(self, image_path):
        ext = os.path.splitext(image_path)[1].lower()

        if ext in (".tif", ".tiff"):
            try:
                with rasterio.open(image_path) as src:
                    if src.count < 1 or src.width < 1 or src.height < 1:
                        raise ValueError("Thermal image has no readable raster band.")
                    image = src.read(1).astype(np.float32)
            except rasterio.errors.RasterioIOError as exc:
                raise ValueError("Thermal TIFF could not be decoded.") from exc
        elif ext in (".jpg", ".jpeg"):
            with Image.open(image_path) as img:
                image = np.array(img.convert("L"), dtype=np.float32)
        else:
            raise ValueError(f"Unsupported image format: {ext}")

        if image.ndim != 2:
            raise ValueError(
                f"Expected a single grayscale band, got shape {image.shape}"
            )
        if image.size == 0:
            raise ValueError("Thermal image is empty.")

        image = np.nan_to_num(image, copy=False, nan=0.0, posinf=0.0, neginf=0.0)

        image_min = float(image.min())
        image_max = float(image.max())

        if image_max > image_min:
            image = (image - image_min) / (image_max - image_min + 1e-8)
        else:
            image = np.zeros_like(image, dtype=np.float32)

        image_uint8 = (image * 255).clip(0, 255).astype(np.uint8)
        image_uint8 = cv2.resize(
            image_uint8,
            (self.image_size, self.image_size),
            interpolation=cv2.INTER_LINEAR,
        )
        image_rgb = cv2.cvtColor(image_uint8, cv2.COLOR_GRAY2RGB)
        tensor = torch.from_numpy(image_rgb.astype(np.float32) / 255.0)
        tensor = tensor.permute(2, 0, 1).unsqueeze(0)

        return image_rgb, tensor
