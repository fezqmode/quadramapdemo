@ -1,24 +1,27 @@
// map.js
document.addEventListener('DOMContentLoaded', () => {
  // 1) initialize the map
  const map = L.map('mapid').setView([20, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  let riskData = {};

  // 2) load per-country risk levels
  // 2) load your riskData.json (now including numeric score)
  fetch('riskData.json')
    .then(res => res.ok ? res.json() : Promise.reject(res.status))
    .then(json => {
      riskData = json;
    .then(res => {
      if (!res.ok) throw new Error('Failed to load riskData.json: ' + res.status);
      return res.json();
    })
    .then(data => {
      riskData = data;
      drawCountries();
      addLegend();
    })
    .catch(err => console.error('Failed to load riskData.json:', err));
    .catch(err => console.error('riskData.json error:', err));

  // 3) draw GeoJSON
  // 3) fetch & render GeoJSON
  function drawCountries() {
    fetch('custom.geo.json')
      .then(res => res.json())
@ -28,36 +31,46 @@ document.addEventListener('DOMContentLoaded', () => {
          onEachFeature: bindInteractions
        }).addTo(map);
      })
      .catch(err => console.error('Failed to load custom.geo.json:', err));
      .catch(err => console.error('custom.geo.json error:', err));
  }

  // 4) style by risk
  // 4) style each country by its risk value
  function styleByRisk(feature) {
    const props = feature.properties;
    const iso   = props.iso_a3 || props.ISO_A3 || '';
    const risk  = (riskData[iso] && riskData[iso].risk) ? riskData[iso].risk : 'low';
    const colors = { high:'#ff0000', medium:'#ffa500', low:'#00ff00' };
    const entry = riskData[iso] || { risk: 'low' };
    const colors = {
      high:   '#ff0000',
      medium: '#ffa500',
      low:    '#00ff00'
    };
    const fill = colors[entry.risk] || colors.low;
    return {
      fillColor:   colors[risk] || colors.low,
      fillColor:   fill,
      color:       '#333',
      weight:      1,
      fillOpacity: 0.6
    };
  }

  // 5) tooltip now shows name + risk, plus hover & click
  // 5) attach tooltip (now with numeric score), hover, click
  function bindInteractions(feature, layer) {
    const props = feature.properties;
    const iso   = props.iso_a3 || props.ISO_A3 || '';
    const name  = props.admin  || props.ADMIN   || iso;
    const entry = riskData[iso] || { risk:'low', url:'#' };
    const risk  = entry.risk || 'low';
    const name  = props.admin || props.ADMIN || iso;
    const entry = riskData[iso] || { risk: 'low', score: 0, url: '#' };

    // capitalize risk label
    const riskLabel = entry.risk.charAt(0).toUpperCase() + entry.risk.slice(1);
    const score     = entry.score != null ? entry.score : '—';

    // show name and risk in tooltip
    layer.bindTooltip(
      `<strong>${name}</strong><br>Risk: <em>${risk.charAt(0).toUpperCase() + risk.slice(1)}</em>`,
      { sticky: true }
    );
    // build tooltip HTML
    const html = `
      <strong>${name}</strong><br>
      Risk: <em>${riskLabel}</em><br>
      Score: <strong>${score}</strong>
    `;
    layer.bindTooltip(html, { sticky: true });

    layer.on('mouseover', () => {
      layer.setStyle({ weight: 3, fillOpacity: 0.8 });
@ -73,19 +86,19 @@
    });
  }

  // 6) legend
  // 6) legend for high/medium/low
  function addLegend() {
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'legend');
      div.innerHTML = `
        <i style="background:#ff0000;width:18px;height:18px;display:inline-block;margin-right:6px;"></i> High Risk<br>
        <i style="background:#ffa500;width:18px;height:18px;display:inline-block;margin-right:6px;"></i> Medium Risk<br>
        <i style="background:#00ff00;width:18px;height:18px;display:inline-block;margin-right:6px;"></i> Low Risk
      `;
      return div;
    };
    legend.addTo(map);
  }
});
