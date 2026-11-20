# Wildfire Vision AI - Backend

Each successful prediction stores its generated masks, overlays, maps, model score array, and CSV in `outputs/<run-id>/`. The existing response fields are unchanged; their output paths identify that run so later inference requests cannot overwrite artifacts while the Results page is loading them. The score array is stored beside the masks as `probability_map.npy`, and the Results page downloads the CSV from the same run directory.
