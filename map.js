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

  // Dropdowns
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

  // Helper: get subcategory data, fallback to first present
  function getSubcategoryData(jurisdictionData) {
    if (!jurisdictionData) return {};
    if (currentSubcategory !== 'all') {
      return jurisdictionData[currentSubcategory] || {};
    }
    // Fallback to first present category
    const categories = ["Sectoral", "Financial", "Goods", "Services"];
    for (const c of categories) {
      if (jurisdictionData[c]) return jurisdictionData[c];
    }
    return {};
  }

  // Popup builder
  function buildPopup(iso, feature) {
    const jurisdictionData = (riskData[iso] && riskData[iso][currentJurisdiction]) || {};
    const subData = getSubcategoryData(jurisdictionData);

    const score = subData.score ?? 0;
    const risk = subData.risk ?? 'N/A';

    // Show number of acts etc.
    let extraFields = '';
    if (currentJurisdiction === 'US') {
      extraFields = `<em>EO:</em> ${subData.eo ?? 0}, <em>Det:</em> ${subData.det ?? 0}, <em>Lic:</em> ${subData.lic ?? 0}<br>`;
    } else if (currentJurisdiction === 'EU' || currentJurisdiction === 'UK') {
      extraFields = `<em>Regs:</em> ${subData.reg ?? 0}<br>`;
    }

    // Details list (short)
    let details = '';
    if (subData.details && Array.isArray(subData.details)) {
      details = `<div style="margin-top:7px;"><b>Key Measures:</b><ul>`;
      subData.details.slice(0, 4).forEach(item => {
        details += `<li>${item.reference}: ${item.description}</li>`;
      });
      if (subData.details.length > 4) details += `<li>...see more</li>`;
      details += '</ul></div>';
    }

    return `
      <strong>${feature.properties.admin}</strong><br>
      <em>Risk:</em> ${risk}<br>
      <em>Score:</em> ${score}<br>
      ${extraFields}
      <a href="${jurisdictionData.url || `https://fezqmode.github.io/quadramapdemo/${iso}`}" target="_blank" rel="noopener">Open Country Page</a>
      ${details}
    `;
  }

  // --- Main Render Function ---
  let geoLayer = null;

  function renderMap() {
    if (geoLayer) {
      map.removeLayer(geoLayer);
    }
    geoLayer = L.geoJSON(geoData, {
      style: function(feature) {
        const iso = feature.properties.iso_a3;
        const jurisdictionData = (riskData[iso] && riskData[iso][currentJurisdiction]) || {};
        const subData = getSubcategoryData(jurisdictionData);
        return {
          fillColor: colorFor(subData.score ?? 0),
          color: '#444',
          weight: 1,
          opacity: 1,
          fillOpacity: 0.6
        };
      },
      onEachFeature: function(feature, layer) {
        const iso = feature.properties.iso_a3;
        // Always build popup with current subcategory data
        const popupHtml = buildPopup(iso, feature);
        layer.bindPopup(popupHtml, {autoPan: true});
        // Show popup on mouseover (not just click)
        layer.on('mouseover', function(e) {
          this.openPopup();
          layer.setStyle({ weight: 2, color: '#000' });
        });
        layer.on('mouseout', function(e) {
          this.closePopup();
          geoLayer.resetStyle(layer);
        });
        // Clicking opens country page in new tab
        layer.on('click', function(e) {
          const jurisdictionData = (riskData[iso] && riskData[iso][currentJurisdiction]) || {};
          window.open(jurisdictionData.url || `https://fezqmode.github.io/quadramapdemo/${iso}`, '_blank');
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
