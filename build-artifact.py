# -*- coding: utf-8 -*-
"""
Artifact（共有リンク）用に、index.html + css/js を1ファイルへ束ねるビルドスクリプト。
実行: python build-artifact.py
出力: scratchpad/artifact.html （Artifactツールへそのまま渡す）
"""
import io, re, sys, os

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(BASE, 'artifact.html')

def read(rel):
    with io.open(os.path.join(BASE, rel), encoding='utf-8') as f:
        return f.read()

html = read('index.html')

# <head>内は使わない（Artifact側でtitle/headを別途扱うため）。<body>の中身だけ取り出す。
body = re.search(r'<body>(.*)</body>', html, re.S).group(1)

# 元のscriptタグ（外部ファイル参照）を除去し、後でインラインscriptに差し替える
body = re.sub(r'\s*<script src="js/[^"]+"></script>\s*', '\n', body)

css = read('css/style.css')
data_js = read('js/data.js')
report_css_js = read('js/report-css.js')
report_js = read('js/report.js')
app_js = read('js/app.js')

out = f'''<meta charset="UTF-8">
<title>AI業務自動化診断</title>
<style>
{css}
</style>
{body.strip()}
<script>
{data_js}
</script>
<script>
{report_css_js}
</script>
<script>
{report_js}
</script>
<script>
{app_js}
</script>
'''

with io.open(OUT, 'w', encoding='utf-8') as f:
    f.write(out)

print('wrote', OUT, len(out), 'chars')
