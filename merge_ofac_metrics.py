#!/usr/bin/env python3
import json, csv

# ─── 1) Load your base riskData.json ──────────────────────────────────────────
with open('riskData.json', 'r', encoding='utf-8') as f:
    risk = json.load(f)

# ─── 2) Read the OFAC metrics CSV ────────────────────────────────────────────
metrics = {}
with open('ofac_programs_metrics.csv', newline='', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        metrics[row['Program Name'].strip()] = {
            'eo_count':      int(row.get('EO_Count', 0) or 0),
            'det_count':     int(row.get('Determination_Count', 0) or 0),
            'license_count': int(row.get('License_Count', 0) or 0),
            'ofac_url':      row.get('URL', '').strip()
        }

# ─── 3) ISO→Program mapping ──────────────────────────────────────────────────
ISO_TO_PROGRAM = {
    # Afghanistan
    'AFG': 'Afghanistan-Related Sanctions',

    # Balkans (multi-country)
    'ALB': 'Balkans-Related Sanctions',
    'BIH': 'Balkans-Related Sanctions',
    'MNE': 'Balkans-Related Sanctions',
    'SRB': 'Balkans-Related Sanctions',

    # Belarus
    'BLR': 'Belarus Sanctions',

    # Burma / Myanmar
    'MMR': 'Burma-Related Sanctions',

    # Central African Republic
    'CAF': 'Central African Republic Sanctions',

    # China (military companies)
    'CHN': 'Chinese Military Companies Sanctions',

    # Cuba
    'CUB': 'Cuba Sanctions',

    # DR Congo
    'COD': 'Democratic Republic of the Congo-Related Sanctions',

    # Ethiopia
    'ETH': 'Ethiopia-Related Sanctions',

    # Iran (state-linked & general)
    'IRN': 'Iran Sanctions',

    # Iraq (assign to Counter Terrorism as placeholder)
    'IRQ': 'Counter Terrorism Sanctions',

    # Libya
    'LBY': 'Libya-Related Sanctions',

    # Nicaragua
    'NIC': 'Nicaragua-related Sanctions',

    # North Korea
    'PRK': 'North Korea Sanctions',

    # Somalia
    'SOM': 'Somalia Sanctions',

    # South Sudan
    'SSD': 'South Sudan-Related Sanctions',

    # Sudan & Darfur
    'SDN': 'Sudan and Darfur Sanctions',

    # Ukraine & Russia
    'UKR': 'Ukraine-/Russia-related Sanctions',
    'RUS': 'Ukraine-/Russia-related Sanctions',

    # Venezuela
    'VEN': 'Venezuela-Related Sanctions',

    # Yemen
    'YEM': 'Yemen-related Sanctions',
}

# ─── 4) Inject OFAC counts into risk entries ───────────────────────────────────
for iso, entry in risk.items():
    prog = ISO_TO_PROGRAM.get(iso)
    if prog and prog in metrics:
        entry.update(metrics[prog])

# ─── 5) Write out enriched JSON ───────────────────────────────────────────────
with open('riskData_enriched.json', 'w', encoding='utf-8') as f:
    json.dump(risk, f, indent=2, ensure_ascii=False)

print("✅ Wrote riskData_enriched.json with OFAC counts.")