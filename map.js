document.addEventListener('DOMContentLoaded', () => {
  // Base map layer
  const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  });

  // Map init
  const map = L.map('mapid', {
    center: [20, 0],
    zoom: 2,
    layers: [osm]
  });

  function colorFor(score) {
    const s = Math.max(0, Math.min(100, +score));
    const r = Math.round(255 * s / 100);
    const g = Math.round(255 * (100 - s) / 100);
    return `rgb(${r},${g},0)`;
  }

  // State
  let geoData, riskData;
  let currentJurisdiction = 'US';
  let currentSubcategory = 'all';
  let geoLayer = null;

  // Dropdown setup
  function setupDropdowns() {
    const jurisdictionSelect = document.getElementById('jurisdictionSelect');
    const subcategorySelect = document.getElementById('subcategorySelect');
    jurisdictionSelect.value = currentJurisdiction;
    subcategorySelect.value = currentSubcategory;
    jurisdictionSelect.addEventListener('change', () => {
      currentJurisdiction = jurisdictionSelect.value;
      renderMap();
    });
    subcategorySelect.addEventListener('change', () => {
      currentSubcategory = subcategorySelect.value;
      renderMap();
    });
  }

  // Popup HTML builder
  function buildPopup(iso, feature) {
    const entry = (riskData[iso] && riskData[iso][currentJurisdiction]) || {};
    let catObj = entry;
    if (currentSubcategory !== 'all' && entry[currentSubcategory]) {
      catObj = entry[currentSubcategory];
    }
    let score = catObj.score ?? entry.score ?? 0;
    let risk = catObj.risk ?? entry.risk ?? 'N/A';
    let eo = catObj.eo ?? entry.eo ?? 0;
    let det = catObj.det ?? entry.det ?? 0;
    let lic = catObj.lic ?? entry.lic ?? 0;
    let reg = catObj.reg ?? entry.reg ?? 0;
    let details = '';

    if (catObj.details && catObj.details.length) {
      details = `<div style="margin-top:8px;"><b>Details:</b><ul style="margin-bottom:0;">`;
      catObj.details.forEach(item => {
        let ref = item.reference ? `<b>${item.reference}:</b> ` : '';
        let url = item.full_text_url
          ? ` <a href="${item.full_text_url}" target="_blank" rel="noopener">[source]</a>`
          : '';
        details += `<li>${ref}${item.description || ''}${url}</li>`;
      });
      details += '</ul></div>';
    }

    let statLine = (typeof reg === 'number')
      ? `<em>Regulations:</em> ${reg}<br>`
      : `<em>EO:</em> ${eo}, <em>Det:</em> ${det}, <em>Lic:</em> ${lic}<br>`;

    return `
      <strong>${feature.properties.admin}</strong><br>
      <em>Risk:</em> ${risk}<br>
      <em>Score:</em> ${score}<br>
      ${statLine}
      <a href="${entry.url || `https://fezqmode.github.io/quadramapdemo/${iso}`}" target="_blank" rel="noopener">Open Country Page</a>
      ${details}
    `;
  }

  // --- Main Render Function ---
  function renderMap() {
    if (geoLayer) map.removeLayer(geoLayer);
    geoLayer = L.geoJSON(geoData, {
      style: function(feature) {
        const iso = feature.properties.iso_a3;
        const entry = (riskData[iso] && riskData[iso][currentJurisdiction]) || {};
        let catObj = (currentSubcategory !== 'all' && entry[currentSubcategory]) ? entry[currentSubcategory] : entry;
        let score = catObj.score ?? entry.score ?? 0;
        return {
          fillColor: colorFor(score),
          color: '#444',
          weight: 1,
          opacity: 1,
          fillOpacity: 0.6
        };
      },
      onEachFeature: function(feature, layer) {
        const iso = feature.properties.iso_a3;
        layer.on('mouseover', function(e) {
          layer.setStyle({ weight: 2, color: '#000' });
          layer.bindPopup(buildPopup(iso, feature)).openPopup(e.latlng || undefined);
        });
        layer.on('mouseout', function() {
          geoLayer.resetStyle(layer);
          layer.closePopup();
        });
        layer.on('click', function() {
          const entry = (riskData[iso] && riskData[iso][currentJurisdiction]) || {};
          window.open(entry.url || `https://fezqmode.github.io/quadramapdemo/${iso}`, '_blank');
        });
      }
    });
    geoLayer.addTo(map);
  }

  // --- LOAD DATA ---
  Promise.all([
    fetch('custom.geo.json').then(r => r.json()),
    fetch('riskData.json').then(r => r.json())
  ]).then(([geo, risk]) => {
    geoData = geo;
    riskData = risk;
    setupDropdowns();
    renderMap();
    // Legend
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'legend');
      [0, 20, 40, 60, 80, 100].forEach((v, i, arr) => {
        const next = arr[i + 1] || 100;
        div.innerHTML += `<i style="background:${colorFor((v + next) / 2)}"></i> ${v}&ndash;${next}<br>`;
      });
      return div;
    };
    legend.addTo(map);
  }).catch(err => {
    console.error('Map error:', err);
  });
});
