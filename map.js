// map.js

document.addEventListener('DOMContentLoaded', () => {
  // Base map layer
  const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  });

  // Initialize map
  const map = L.map('mapid', {
    center: [20, 0],
    zoom: 2,
    layers: [osm]
  });

  // Color ramp for risk score
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

  // Dropdowns logic
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

  // Main popup HTML builder
  function buildPopup(iso, feature) {
    const entry = (riskData[iso] && riskData[iso][currentJurisdiction]) || {};
    let score, risk, eo, det, lic, reg;
    let detailSection = '';

    // Select keys according to regime
    if (currentJurisdiction === 'EU' || currentJurisdiction === 'UK') {
      reg = entry.reg || 0;
    } else {
      eo = entry.eo || 0;
      det = entry.det || 0;
      lic = entry.lic || 0;
    }
    score = entry.score != null ? entry.score : '—';
    risk = entry.risk || 'N/A';

    // Subcategory details
    if (currentSubcategory !== 'all' && entry[currentSubcategory]) {
      detailSection = `<div style="margin-top:8px;"><b>${currentSubcategory} sanctions:</b><ul>`;
      (entry[currentSubcategory].details || []).forEach(item => {
        detailSection += `<li>${item.reference ? `<b>${item.reference}:</b> ` : ''}${item.description || item.title || ''}</li>`;
      });
      detailSection += '</ul></div>';
    }

    // Regime-specific fields in popup
    let details = `
      <strong>${feature.properties.admin}</strong><br>
      <em>Risk:</em> ${risk}<br>
      <em>Score:</em> ${score}<br>
    `;
    if (currentJurisdiction === 'EU' || currentJurisdiction === 'UK') {
      details += `<em>Regulations:</em> ${reg}<br>`;
    } else {
      details += `<em>EO:</em> ${eo}, <em>Det:</em> ${det}, <em>Lic:</em> ${lic}<br>`;
    }

    details += `
      <a href="${entry.url || `https://fezqmode.github.io/quadramapdemo/${iso}`}" target="_blank" rel="noopener">Open Country Page</a>
      ${detailSection}
    `;

    return details;
  }

  // Main render function
  let geoLayer = null;

  function renderMap() {
    if (geoLayer) {
      map.removeLayer(geoLayer);
    }

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
        layer.bindPopup(buildPopup(iso, feature), { closeButton: false, autoPan: false });

        // Show popup and highlight on mouseover
        layer.on('mouseover', function(e) {
          this.openPopup();
          this.setStyle({ weight: 2, color: '#000' });
        });

        // Hide popup and reset style on mouseout
        layer.on('mouseout', function(e) {
          this.closePopup();
          geoLayer.resetStyle(this);
        });

        // Open country page on click
        layer.on('click', function(e) {
          const entry = (riskData[iso] && riskData[iso][currentJurisdiction]) || {};
          window.open(entry.url || `https://fezqmode.github.io/quadramapdemo/${iso}`, '_blank');
        });
      }
    });
    geoLayer.addTo(map);
  }

  // Load geo and risk data, set up UI, render and legend
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
