# Fire Detection Validation and Corrections

## Root Cause

- The U-Net checkpoint stores a segmentation threshold of `0.3`.
- The checkpoint reports a fire Dice of `0.8827`, fire IoU of `0.794`, and no-fire clean rate of `94.74%`.
- Raw U-Net masks and ConvLSTM masks had no independent sequence-level no-fire decision.
- Small or weak connected regions could therefore become visible fire predictions and a risk score.
- Per-image min-max normalization can amplify gradients and hot regions, so it is not sufficient evidence for a fire-only result.
- The ConvLSTM checkpoint operates as logits followed by sigmoid and was already thresholded at `0.5`; all-zero masks produced an all-zero future mask in a direct probe.

## Implementation

- Preserved both existing model checkpoints and architectures.
- Added `FIRE_UNET_THRESHOLD` and `FIRE_CONVLSTM_THRESHOLD` environment overrides while retaining checkpoint/default thresholds.
- Added a connected-component, fire-pixel-percentage, foreground-confidence, and temporal-change decision layer.
- Added explicit API analytics fields: `fire_status`, `fire_status_code`, fire percentages, component sizes, frame metrics, and temporal-change evidence.
- Updated the Results page with the exact `FIRE DETECTED`, `NO FIRE DETECTED`, and `UNCERTAIN — MANUAL VERIFICATION REQUIRED` statuses.
- Corrected JPG upload validation so JPEG files are validated consistently with preprocessing.

The default decision settings are:

| Setting | Default |
|---|---:|
| U-Net threshold override | Checkpoint `0.3` |
| ConvLSTM threshold override | `0.5` |
| No-fire pixel percentage | `0.2%` |
| No-fire component size | `64` pixels |
| Fire pixel percentage | `0.5%` |
| Fire component size | `256` pixels |
| Foreground probability | `0.55` |
| Minimum strong fire frames | `2` |

## Validation Results

The following were tested with real model inference and the existing checkpoints:

| Input | U-Net result | ConvLSTM result | Final decision |
|---|---:|---:|---|
| Uniform low-temperature image | `0.00%`, no pixels | `0.00%`, no pixels | NO FIRE DETECTED |
| Thermal-like gradient | `0.3311%`, 217 pixels | `0.3311%` | UNCERTAIN — MANUAL VERIFICATION REQUIRED |
| 76×76 hot patch | `2.3224%`, 1522 pixels | `2.3224%` | UNCERTAIN — MANUAL VERIFICATION REQUIRED |
| 16×16 small region | `0.4089%`, 268 pixels | `0.4089%` | UNCERTAIN — MANUAL VERIFICATION REQUIRED |
| Bundled real sequence `sequence_001` | 2375 latest pixels, 647-pixel component | 2347 pixels, 638-pixel component | FIRE DETECTED |

The temporary controlled probes were classification checks only and were not used as training data or saved into ground-truth masks.
