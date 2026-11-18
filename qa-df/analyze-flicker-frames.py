"""Analyze sampled CUA browser JPEGs; this does not control the browser."""
from pathlib import Path
import json
from PIL import Image, ImageChops, ImageStat

folder = Path(__file__).parent / 'results' / 'flicker-fix'
region = (315, 280, 930, 520)  # visible central scene, excludes clock/KPI panels

def image(path):
    return Image.open(path).convert('RGB').crop(region)

def luminance(im):
    return ImageStat.Stat(im.convert('L')).mean[0]

report = {}
for prefix, count in [('moving', 16), ('paused', 8)]:
    frames = [image(folder / f'{prefix}-{i}.jpg') for i in range(count)]
    means = [luminance(frame) for frame in frames]
    differences = [sum(ImageStat.Stat(ImageChops.difference(frames[i-1], frames[i])).mean)/3 for i in range(1, count)]
    report[prefix] = {'sample_count': count, 'luminance_min': min(means), 'luminance_max': max(means), 'max_adjacent_rgb_mean_diff': max(differences)}
    assert min(means) > 30, f'{prefix}: sampled black frame'
    assert max(means) / min(means) < 1.05, f'{prefix}: sampled whole-scene exposure jump'
    if prefix == 'paused':
        assert max(differences) < .05, 'Paused scene changed between sampled frames'
    metadata = json.loads((folder / f'{prefix}-metadata.json').read_text())
    assert len({(r['width'], r['height']) for r in metadata}) == 1, 'Drawing buffer resized during playback'

before, after = [image(folder / f'recovery-{suffix}.jpg') for suffix in ['before', 'after']]
report['recovery'] = {'before_luminance': luminance(before), 'after_luminance': luminance(after), 'rgb_mean_diff': sum(ImageStat.Stat(ImageChops.difference(before, after)).mean)/3}
assert report['recovery']['rgb_mean_diff'] < .1, 'Lighting/scene output did not recover identically'
report['limits'] = 'Sampled frames only; not continuous video or all GPU drivers. Context loss was explicitly simulated through a local QA page.'
(folder / 'analysis.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(report, ensure_ascii=False, indent=2))
