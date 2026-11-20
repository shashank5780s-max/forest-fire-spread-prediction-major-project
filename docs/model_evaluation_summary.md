# FireCast AI Model Evaluation Summary

## Checkpoints

| Model | Checkpoint | Threshold |
|---|---|---:|
| U-Net | `models/unet_fire_segmentation_final.pth` | 0.30 |
| ConvLSTM | `models/future_fire_prediction.pth` | 0.50 |

## Verified values

| Metric | Value | Evidence |
|---|---:|---|
| U-Net Dice | 88.27% | Stored in U-Net checkpoint metadata |
| U-Net IoU | 79.40% | Stored in U-Net checkpoint metadata |
| U-Net no-fire clean rate | 94.74% | Stored in U-Net checkpoint metadata |
| ConvLSTM Dice | 80.76% | Stored notebook 03 output |
| ConvLSTM IoU | 67.72% | Stored notebook 03 output |
| ConvLSTM pixel accuracy | 98.98% | Stored notebook 03 output |
| ConvLSTM BCE loss | 0.0326 | Stored notebook 03 output |

## Fresh local rerun

### U-Net

- Independent ground truth: unavailable.
- Dataset: unavailable external Kaggle dataset.
- Fresh U-Net Dice, IoU, precision, recall, F1, and false-positive rate: unavailable.

Five visually no-fire uploads were also tested:

- 4 of 5 classified with zero U-Net fire pixels.
- 1 classified with 2 fire pixels.
- Pixel false-positive rate: 0.000610%.

### ConvLSTM

- Independent future ground truth: unavailable.
- Dataset: unavailable external Kaggle dataset.
- Fresh ConvLSTM Dice, IoU, precision, recall, F1, pixel accuracy, and false-positive rate: unavailable.

One five-frame genuinely no-fire local sequence produced:

- 0 predicted future fire pixels.
- 0.00% future fire area.
- 0.00% false-positive rate against an all-zero comparison target.

## Target provenance

- U-Net checkpoint metrics: origin and exact held-out test data are not present in this workspace.
- ConvLSTM `80.76%` Dice and `98.98%` pixel accuracy: stored notebook outputs.
- ConvLSTM notebook targets: U-Net-generated pseudo-masks or masks derived from the external FLAME dataset, not independent ground truth.
