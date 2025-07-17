#!/usr/bin/env python3
import requests
from bs4 import BeautifulSoup
import re
from urllib.parse import urljoin
import schedule
import time
import datetime

# ─── Configuration ─────────────────────────────────────────────────────────────
RECENT_URL = 'https://ofac.treasury.gov/recent-actions'
KEYWORDS = [
    'settlement',
    'designations',
    'designation',
    'issuance',
    'removal',
    'executive order',
    'determination',
    'revocation',
    'publication'
]

# ─── Helpers ───────────────────────────────────────────────────────────────────
def fetch(url):
    r = requests.get(url, timeout=10)
    r.raise_for_status()
    return r.text

def summarize(text, sentences=2):
    parts = re.split(r'(?<=[.!?])\s+', text.strip())
    return ' '.join(parts[:sentences]).strip()

# ─── The job to run on schedule ─────────────────────────────────────────────────
def job():
    now = datetime.datetime.now().strftime('%Y-%m-%d_%H%M')
    out_file = f'recent_actions_summary_{now}.txt'

    html = fetch(RECENT_URL)
    soup = BeautifulSoup(html, 'html.parser')

    # 1) find matching links
    links = []
    for a in soup.select('div.view-recent-actions h3 a'):
        title = a.get_text(strip=True)
        href  = urljoin(RECENT_URL, a['href'])
        if any(kw in title.lower() for kw in KEYWORDS):
            links.append((title, href))

    # 2) build the summary text
    lines = [f"Summary run at {datetime.datetime.now()}\nFound {len(links)} matches:\n"]
    for title, href in links:
        detail = fetch(href)
        body_el = BeautifulSoup(detail, 'html.parser').select_one('div.field--name-body')
        full_text = body_el.get_text(separator=' ', strip=True) if body_el else ''
        summ = summarize(full_text, sentences=2) or '— No content to summarize —'
        lines.append(f"> {title}\nURL: {href}\n{summ}\n")

    # 3) write out to .txt
    with open(out_file, 'w') as f:
        f.write('\n'.join(lines))

    print(f"✅ Wrote summary to {out_file}")

# ─── Schedule setup ────────────────────────────────────────────────────────────
if __name__ == '__main__':
    # Schedule at 09:00, 13:00, 19:00 CEST daily
    schedule.every().day.at("09:00").do(job)
    schedule.every().day.at("13:00").do(job)
    schedule.every().day.at("19:00").do(job)

    print("🕒 Scheduler started — waiting for jobs…")
    # Optionally, run once immediately
    # job()

    while True:
        schedule.run_pending()
        time.sleep(30)