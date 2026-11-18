"""Compare deterministic WebGL frames after verify.cjs. Requires Pillow."""
from pathlib import Path
import json
from PIL import Image, ImageChops, ImageStat

root = Path(__file__).parent / 'results'
report = {}
for prefix in ('stable', 'quality-stable'):
    a = Image.open(root / f'{prefix}-a.png').convert('RGB')
    b = Image.open(root / f'{prefix}-b.png').convert('RGB')
    diff = ImageChops.difference(a, b)
    values = ImageStat.Stat(diff).mean
    report[prefix] = {'full_frame_rgb_mean_diff': values,
                      'background_rgb_mean_diff': ImageStat.Stat(diff.crop((450, 15, 1000, 130))).mean}
    assert max(values) < .02, f'{prefix} static frames have unexpected shimmer: {values}'
(root / 'stability.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report, indent=2))
