// map.js

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

  // Helper: update dropdowns
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

  // Helper: main popup HTML builder
  function buildPopup(iso, feature) {
    const entry = (riskData[iso] && riskData[iso][currentJurisdiction]) || {};
    const score = entry.score || 0;
    const risk = entry.risk || 'N/A';
    const eo = entry.eo || 0;
    const det = entry.det || 0;
    const lic = entry.lic || 0;
    // Subcategory specific
    let details = '';
    if (currentSubcategory !== 'all' && entry[currentSubcategory]) {
      details = `<div style="margin-top:8px;"><b>${currentSubcategory} sanctions:</b><ul>`;
      entry[currentSubcategory].forEach(item => {
        details += `<li>${item.title || item.description || '—'}</li>`;
      });
      details += '</ul></div>';
    }
    return `
      <strong>${feature.properties.admin}</strong><br>
      <em>Risk:</em> ${risk}<br>
      <em>Score:</em> ${score}<br>
      <em>EO:</em> ${eo}, <em>Det:</em> ${det}, <em>Lic:</em> ${lic}<br>
      <a href="${entry.url || `https://fezqmode.github.io/quadramapdemo/${iso}`}" target="_blank" rel="noopener">Open Country Page</a>
      ${details}
    `;
  }

  // --- Main Render Function ---
  let geoLayer = null;

  function renderMap() {
    if (geoLayer) {
      map.removeLayer(geoLayer);
    }

    // Build new geoJSON layer
    geoLayer = L.geoJSON(geoData, {
      style: function(feature) {
        const iso = feature.properties.iso_a3;
        const entry = (riskData[iso] && riskData[iso][currentJurisdiction]) || {};
        return {
          fillColor: colorFor(entry.score || 0),
          color: '#444',
          weight: 1,
          opacity: 1,
          fillOpacity: 0.6
        };
      },
      onEachFeature: function(feature, layer) {
        const iso = feature.properties.iso_a3;
        layer.bindPopup(buildPopup(iso, feature));
        layer.on('click', () => {
          const entry = (riskData[iso] && riskData[iso][currentJurisdiction]) || {};
          window.open(entry.url || `https://fezqmode.github.io/quadramapdemo/${iso}`, '_blank');
        });
        layer.on('mouseover', () => layer.setStyle({ weight: 2, color: '#000' }));
        layer.on('mouseout', () => geoLayer.resetStyle(layer));
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
    // Legend remains unchanged
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
