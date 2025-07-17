#!/usr/bin/env python3
import requests
from bs4 import BeautifulSoup
import re
import csv
from urllib.parse import urljoin

# ─── Configuration ─────────────────────────────────────────────────────────────
BASE_URL = 'https://ofac.treasury.gov/sanctions-programs-and-country-information'
OUTPUT_CSV = 'ofac_programs_metrics.csv'

# ─── Setup HTTP session with retries ───────────────────────────────────────────
session = requests.Session()
retries = requests.adapters.Retry(
    total=3,
    backoff_factor=0.5,
    status_forcelist=[500, 502, 503, 504]
)
adapter = requests.adapters.HTTPAdapter(max_retries=retries)
session.mount('https://', adapter)
session.mount('http://', adapter)

# ─── Helper to fetch a URL or return None on error ──────────────────────────────
def fetch(url, timeout=20):
    try:
        resp = session.get(url, timeout=timeout)
        resp.raise_for_status()
        return resp.text
    except Exception as e:
        print(f"⚠️  Fetch error for {url}: {e}")
        return None

# ─── Count patterns in HTML ────────────────────────────────────────────────────
def count_executive_orders(html):
    if not html:
        return None
    patterns = [r'E\.O\.\s*\d+', r'Executive Order\s*\d+']
    matches = set()
    for pat in patterns:
        matches.update(re.findall(pat, html, flags=re.IGNORECASE))
    return len(matches)

def count_determinations(html):
    return None if not html else len(re.findall(r'\bDetermination\b', html, flags=re.IGNORECASE))

def count_licenses(html):
    return None if not html else len(re.findall(r'General License', html, flags=re.IGNORECASE))

# ─── 1. Gather all program links ───────────────────────────────────────────────
def list_programs():
    html = fetch(BASE_URL)
    if not html:
        print("❌ Cannot fetch main page, aborting.")
        return {}
    soup = BeautifulSoup(html, 'html.parser')
    anchors = soup.find_all('a', href=re.compile(r'/sanctions-programs-and-country-information/'))
    programs = {}
    for a in anchors:
        name = a.get_text(strip=True)
        href = a.get('href')
        if name and href:
            programs[name] = urljoin(BASE_URL, href)
    return programs

# ─── 2. Analyze each program page ──────────────────────────────────────────────
def analyze_programs(programs):
    rows = []
    for name, url in sorted(programs.items()):
        print(f"🔎 Processing: {name}")
        html = fetch(url)
        eo_count  = count_executive_orders(html)
        det_count = count_determinations(html)
        lic_count = count_licenses(html)
        rows.append({
            'Program Name':        name,
            'URL':                 url,
            'EO_Count':            eo_count if eo_count is not None else '',
            'Determination_Count': det_count if det_count is not None else '',
            'License_Count':       lic_count if lic_count is not None else ''
        })
    return rows

# ─── 3. Write out to CSV ───────────────────────────────────────────────────────
def write_csv(rows, filename=OUTPUT_CSV):
    fieldnames = ['Program Name', 'URL', 'EO_Count', 'Determination_Count', 'License_Count']
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)
    print(f"✅ Metrics written to {filename}")

# ─── Main ─────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    progs = list_programs()
    print(f"🔍 Found {len(progs)} programs\n")
    data_rows = analyze_programs(progs)
    write_csv(data_rows)