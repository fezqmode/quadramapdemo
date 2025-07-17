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
    layers: [osm],
    maxBounds: [[-85, -180], [85, 180]],
    maxBoundsViscosity: 1.0
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

  // Dropdown filter UI
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
    let score, risk, counts = '';

    // Use subcategory for counts, fallback to aggregate if not available
    if (currentSubcategory !== 'all' && entry[currentSubcategory]) {
      const cat = entry[currentSubcategory];
      score = cat.score != null ? cat.score : (entry.score != null ? entry.score : 0);
      risk = cat.risk || entry.risk || 'N/A';
      if ('eo' in cat) counts += `EO: ${cat.eo}, `;
      if ('det' in cat) counts += `Det: ${cat.det}, `;
      if ('lic' in cat) counts += `Lic: ${cat.lic}, `;
      if ('reg' in cat) counts += `Reg: ${cat.reg}, `;
      counts = counts.replace(/, $/, '');
    } else {
      score = entry.score != null ? entry.score : 0;
      risk = entry.risk || 'N/A';
      if ('eo' in entry) counts += `EO: ${entry.eo}, `;
      if ('det' in entry) counts += `Det: ${entry.det}, `;
      if ('lic' in entry) counts += `Lic: ${entry.lic}, `;
      if ('reg' in entry) counts += `Reg: ${entry.reg}, `;
      counts = counts.replace(/, $/, '');
    }

    // Subcategory details
    let details = '';
    if (
      currentSubcategory !== 'all' &&
      entry[currentSubcategory] &&
      Array.isArray(entry[currentSubcategory].details)
    ) {
      const detailList = entry[currentSubcategory].details;
      if (detailList.length > 0) {
        details = `
<div style="margin-top:10px; max-height:195px; overflow-y:auto; font-size: 0.97em;">
  <b>Sanction Details:</b>
  <ul style="padding-left: 17px; margin-bottom:0;">
    ${detailList
      .map(
        item => `<li style="margin-bottom:6px;">
          <span style="font-weight:600;">${item.type || ''}${item.reference ? ' – ' + item.reference : ''}</span><br>
          ${item.description || ''}<br>
          <span style="color:#456;"><i>${item.targets || ''}</i></span><br>
          ${item.full_text_url ? `<a href="${item.full_text_url}" target="_blank" rel="noopener">Source</a>` : ''}
        </li>`
      )
      .join('')}
  </ul>
</div>`;
      }
    }

    // Main popup
    return `
<div style="max-width:370px;">
  <strong style="font-size:1.16em;">${feature.properties.admin}</strong><br>
  <em>Risk:</em> ${risk}<br>
  <em>Score:</em> ${score}<br>
  ${counts ? `<span>${counts}</span><br>` : ''}
  <a href="country.html?iso=${iso}&jurisdiction=${encodeURIComponent(currentJurisdiction)}&category=${encodeURIComponent(currentSubcategory)}" target="_blank" rel="noopener" style="font-size:0.98em; color:#207">Open Full Country Page</a>
  ${details}
</div>`;
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
        let score = 0;
        // Show score of subcategory if filtered
        if (
          currentSubcategory !== 'all' &&
          entry[currentSubcategory] &&
          entry[currentSubcategory].score != null
        ) {
          score = entry[currentSubcategory].score;
        } else if (entry.score != null) {
          score = entry.score;
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
        layer.on('mouseover', function() {
          if (!layer.isPopupOpen()) layer.openPopup();
          layer.setStyle({ weight: 2, color: '#000' });
        });
        // Mouseout: close popup, reset style
        layer.on('mouseout', function() {
          if (layer.isPopupOpen()) layer.closePopup();
          geoLayer.resetStyle(layer);
        });
        // Click: open new page for country with selected jurisdiction and subcategory
        layer.on('click', function() {
          const params = new URLSearchParams({
            iso: iso,
            jurisdiction: currentJurisdiction,
            category: currentSubcategory
          }).toString();
          window.open('country.html?' + params, '_blank');
        });
      }
    });
    geoLayer.addTo(map);

    // Ensure popups always pan into view without snapping/jumping
    geoLayer.on('popupopen', function(e) {
      const popup = e.popup;
      setTimeout(() => {
        try {
          const popupEl = popup.getElement();
          if (!popupEl) return;
          // Get bounding box of popup relative to window
          const rect = popupEl.getBoundingClientRect();
          // If popup is above the top edge (including dropdown bar), pan map down
          if (rect.top < 80) {
            const diff = 90 - rect.top;
            map.panBy([0, diff], { animate: true });
          }
          // If popup is below window, pan up
          if (rect.bottom > window.innerHeight - 30) {
            const diff = rect.bottom - window.innerHeight + 45;
            map.panBy([0, -diff], { animate: true });
          }
        } catch (e) {}
      }, 60);
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
