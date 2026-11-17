"""Render the compiled report and record text/layout checks; no model fitting."""
from pathlib import Path
import hashlib
import json
import re

import pymupdf
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
pdf = ROOT / 'Assignment_Report/Assignment-main.pdf'
out = ROOT / '.cache/report_qa'
out.mkdir(parents=True, exist_ok=True)
doc = pymupdf.open(pdf)
pages = []
thumbs = []
for i, page in enumerate(doc):
    pix = page.get_pixmap(matrix=pymupdf.Matrix(1.5, 1.5), alpha=False)
    target = out / f'page_{i+1:02d}.png'
    pix.save(target)
    text = page.get_text()
    assert '\ufffd' not in text, f'Replacement glyph on page {i+1}'
    assert len(text.strip()) > 20, f'Unexpected blank page {i+1}'
    pages.append({'page': i+1, 'text_characters': len(text), 'width_pt': page.rect.width,
                  'height_pt': page.rect.height})
    im = Image.open(target).convert('RGB')
    im.thumbnail((450, 637))
    thumb = Image.new('RGB', (470, 672), '#dddddd')
    thumb.paste(im, ((470-im.width)//2, 25))
    ImageDraw.Draw(thumb).text((12, 7), f'Page {i+1}', fill='black')
    thumbs.append(thumb)
for start in range(0, len(thumbs), 6):
    panel = Image.new('RGB', (3*470, 2*672), 'white')
    for j, thumb in enumerate(thumbs[start:start+6]):
        panel.paste(thumb, ((j%3)*470, (j//3)*672))
    panel.save(out / f'contact_{start+1:02d}_{min(start+6,len(thumbs)):02d}.jpg', quality=90)
log = (ROOT / 'Assignment_Report/Assignment-main.log').read_text(errors='replace')
issues = re.findall(r'^.*(?:Overfull|Missing character|undefined references|undefined citations|Citation .* undefined|Reference .* undefined).*$', log, re.MULTILINE)
result = {'pdf': str(pdf.relative_to(ROOT)), 'sha256': hashlib.sha256(pdf.read_bytes()).hexdigest(),
          'page_count': len(doc), 'pages': pages, 'latex_issues': issues,
          'visual_review': 'Review the rendered contact sheets and full pages before delivery.'}
(out / 'report_checks.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
assert not issues, issues
print(json.dumps({'pages': len(doc), 'latex_issues': issues, 'render_directory': str(out)}, ensure_ascii=False))
