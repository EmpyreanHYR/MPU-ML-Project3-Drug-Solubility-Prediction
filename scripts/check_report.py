"""Render the compiled report and record text/layout checks; no model fitting."""
from pathlib import Path
import argparse
import json
import re

import pymupdf
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--pdf', type=Path, default=ROOT / 'Report_final/COMP6133_GroupReport_Group08.pdf')
parser.add_argument('--log', type=Path, help='Optional LaTeX build log for archived source checks')
args = parser.parse_args()
pdf = args.pdf.resolve()
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
log = args.log.read_text(errors='replace') if args.log else ''
issues = re.findall(r'^.*(?:Overfull|Missing character|undefined references|undefined citations|Citation .* undefined|Reference .* undefined).*$', log, re.MULTILINE)
result = {'pdf': str(pdf), 'latex_log_checked': args.log is not None,
          'page_count': len(doc), 'pages': pages, 'latex_issues': issues,
          'visual_review': 'Review the rendered contact sheets and full pages before delivery.'}
(out / 'report_checks.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
assert not issues, issues
print(json.dumps({'pages': len(doc), 'latex_issues': issues, 'render_directory': str(out)}, ensure_ascii=False))
