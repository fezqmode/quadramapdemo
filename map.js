// map.js

document.addEventListener('DOMContentLoaded', () => {
  // Base map layer
  const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  });

  // Initialize map with default viewport and base layer
  const map = L.map('mapid', {
    center: [20, 0],
    zoom: 2,
    layers: [osm]
  });

  // Helper: color ramp for scores
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

  // Main popup builder
  function buildPopup(iso, feature) {
    const entry = (riskData[iso] && riskData[iso][currentJurisdiction]) || {};
    let cat = entry;
    let score = entry.score != null ? entry.score : 0;
    let risk = entry.risk || 'N/A';
    let counts = '';

    // If subcategory is selected, use that category's stats
    if (currentSubcategory !== 'all' && entry[currentSubcategory]) {
      cat = entry[currentSubcategory];
      if (cat.score != null) score = cat.score;
      if (cat.risk) risk = cat.risk;
    }

    // EO/DET/LIC/REG counters, depending on available data
    if ('eo' in cat) counts += `EO: ${cat.eo}, `;
    if ('det' in cat) counts += `Det: ${cat.det}, `;
    if ('lic' in cat) counts += `Lic: ${cat.lic}, `;
    if ('reg' in cat) counts += `Reg: ${cat.reg}, `;
    counts = counts.replace(/, $/, '');

    // Subcategory-specific details (for 'all', show nothing)
    let details = '';
    if (
      currentSubcategory !== 'all' &&
      cat.details &&
      Array.isArray(cat.details) &&
      cat.details.length > 0
    ) {
      details = `<div style="margin-top:7px; font-size:13.5px; line-height:1.45; max-height:210px; overflow:auto;">
        <b>Sanction Details:</b>
        <ul style="padding-left:20px; margin:5px 0 0 0; max-height:175px; overflow-y:auto;">`;
      cat.details.forEach(item => {
        details += `<li style="margin-bottom:3px;">
            <b>${item.type}:</b> ${item.reference ? `<span>${item.reference}</span> – ` : ''}
            ${item.description || ''}
            ${item.targets ? `<br><span style="font-size:12px; color:#666;">Targets: ${item.targets}</span>` : ''}
            ${item.full_text_url ? `<br><a href="${item.full_text_url}" target="_blank" style="font-size:12px;">Source</a>` : ''}
        </li>`;
      });
      details += `</ul></div>`;
    }

    // Main popup content
    return `
      <div>
        <div style="font-size:1.13em; font-weight:700; margin-bottom:2px;">${feature.properties.admin}</div>
        <div style="margin-bottom:2px;">
          <span style="font-weight:500;">Risk:</span> ${risk}
        </div>
        <div style="margin-bottom:2px;">
          <span style="font-weight:500;">Score:</span> ${score}
        </div>
        ${counts ? `<div style="margin-bottom:2px;">${counts}</div>` : ''}
        <div style="margin-bottom:4px;">
          <a href="${entry.url || `https://fezqmode.github.io/quadramapdemo/${iso}`}" target="_blank" rel="noopener">Open Country Page</a>
        </div>
        ${details}
      </div>
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
        const entry = (riskData[iso] && riskData[iso][currentJurisdiction]) || {};
        let score = entry.score != null ? entry.score : 0;
        if (
          currentSubcategory !== 'all' &&
          entry[currentSubcategory] &&
          entry[currentSubcategory].score != null
        ) {
          score = entry[currentSubcategory].score;
        }
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
        layer.bindPopup(buildPopup(iso, feature), {
          autoPan: true,
          maxWidth: 410,
          className: 'custom-leaflet-popup'
        });

        // Mouseover: open popup (if not open)
        layer.on('mouseover', function(e) {
          if (!layer.isPopupOpen()) layer.openPopup();
          layer.setStyle({ weight: 2, color: '#000' });
        });
        // Mouseout: close popup, reset style
        layer.on('mouseout', function(e) {
          if (layer.isPopupOpen()) layer.closePopup();
          geoLayer.resetStyle(layer);
        });
        // Click: open new page for country
        layer.on('click', function(e) {
          const entry = (riskData[iso] && riskData[iso][currentJurisdiction]) || {};
          window.open(entry.url || `https://fezqmode.github.io/quadramapdemo/${iso}`, '_blank');
        });
      }
    });
    geoLayer.addTo(map);

    // Ensure popups always pan into full view (especially from top)
    geoLayer.on('popupopen', function(e) {
      const popup = e.popup;
      const MIN_TOP = 110; // Adjust for your dropdown/top bar height
      setTimeout(() => {
        const popupPoint = map.latLngToContainerPoint(popup.getLatLng());
        if (popupPoint.y < MIN_TOP) {
          const offset = MIN_TOP - popupPoint.y;
          const newPoint = L.point(popupPoint.x, popupPoint.y + offset + 10);
          const newLatLng = map.containerPointToLatLng(newPoint);
          map.panTo(newLatLng, { animate: true });
        }
      }, 110); // Wait for Leaflet to fully render the popup
    });
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

    // Legend (color ramp)
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
