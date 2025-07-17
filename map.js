// map.js

// 1) Utility: simple CSV parser (or drop in PapaParse)
function parseCSV(text) {
  const [headerLine, ...lines] = text.trim().split('\n');
  const headers = headerLine.split(',');
  return lines.map(l => {
    const cols = l.split(',');
    return headers.reduce((obj, h, i) => {
      obj[h] = cols[i];
      return obj;
    }, {});
  });
}

// 2) Continuous color ramp from green (0) → red (100)
function getColor(score) {
  const s = Math.max(0, Math.min(100, score));      // clamp 0–100
  const r = Math.round(255 * s / 100);
  const g = Math.round(255 * (100 - s) / 100);
  return `rgb(${r},${g},0)`;
}

// 3) Load all three files in parallel
Promise.all([
  fetch('custom.geo.json').then(r => r.json()),
  fetch('riskData.json').then(r => r.json()),
  fetch('ofac_programs_metrics.csv').then(r => r.text())
])
.then(([geoData, riskData, csvText]) => {
  // 4) build a lookup of metrics by country name
  const metrics = parseCSV(csvText);
  const metricsByCountry = {};
  metrics.forEach(row => {
    // e.g. "Afghanistan-Related Sanctions" → "Afghanistan"
    const country = row['Program Name'].split('-')[0].trim();
    metricsByCountry[country] = {
      eo:   +row.EO_Count,
      det:  +row.Determination_Count,
      lic:  +row.License_Count
    };
  });

  // 5) draw the choropleth
  L.geoJSON(geoData, {
    style: f => {
      const country = f.properties.ADMIN;
      const score   = riskData[country] != null
                    ? riskData[country].riskScore  // 0–100
                    : 0;
      return {
        fillColor: getColor(score),
        weight:     1,
        color:     'white',
        fillOpacity: 0.7
      };
    },
    onEachFeature: (f, layer) => {
      const country = f.properties.ADMIN;
      const score   = riskData[country]?.riskScore ?? 'n/a';
      const m      = metricsByCountry[country] || {eo:0, det:0, lic:0};

      layer.bindPopup(`
        <strong>${country}</strong><br>
        <em>Risk score:</em> ${score}<br>
        <em>Executive orders:</em> ${m.eo}<br>
        <em>Determinations:</em> ${m.det}<br>
        <em>Licenses:</em> ${m.lic}
      `);
    }
  }).addTo(map);

  // 6) (Re)build legend
  const legend = L.control({position: 'bottomright'});
  legend.onAdd = () => {
    const div = L.DomUtil.create('div','info legend');
    const grades = [0,20,40,60,80,100];
    grades.forEach((g,i) => {
      const next = grades[i+1] ?? 100;
      div.innerHTML += 
        `<i style="background:${ getColor((g+next)/2) }"></i> ` +
        `${g}${next<100? '&ndash;'+next : '+'}<br>`;
    });
    return div;
  };
  legend.addTo(map);
})
.catch(err => console.error('Data load error:', err));
