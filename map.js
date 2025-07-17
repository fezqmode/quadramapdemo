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

  // Helper: main popup HTML builder with scroll for long content
  function buildPopup(iso, feature) {
    const entry = (riskData[iso] && riskData[iso][currentJurisdiction]) || {};
    let score, risk, countKey, countValue;
    let counts = '';

    // Use subcategory for counts, fallback to aggregate if not available
    if (currentSubcategory !== 'all' && entry[currentSubcategory]) {
      const cat = entry[currentSubcategory];
      score = cat.score != null ? cat.score : (entry.score != null ? entry.score : 0);
      risk = cat.risk || entry.risk || 'N/A';
      if ('eo' in cat) counts += `<em>EO:</em> ${cat.eo}, `;
      if ('det' in cat) counts += `<em>Det:</em> ${cat.det}, `;
      if ('lic' in cat) counts += `<em>Lic:</em> ${cat.lic}, `;
      if ('reg' in cat) counts += `<em>Reg:</em> ${cat.reg}, `;
      counts = counts.replace(/, $/, '');
    } else {
      score = entry.score != null ? entry.score : 0;
      risk = entry.risk || 'N/A';
      if ('eo' in entry) counts += `<em>EO:</em> ${entry.eo}, `;
      if ('det' in entry) counts += `<em>Det:</em> ${entry.det}, `;
      if ('lic' in entry) counts += `<em>Lic:</em> ${entry.lic}, `;
      if ('reg' in entry) counts += `<em>Reg:</em> ${entry.reg}, `;
      counts = counts.replace(/, $/, '');
    }

    // Subcategory specific details
    let details = '';
    if (currentSubcategory !== 'all' && entry[currentSubcategory] && Array.isArray(entry[currentSubcategory].details)) {
      const detailList = entry[currentSubcategory].details;
      if (detailList.length > 0) {
        details = `<div style="margin-top:8px; max-height:250px; overflow:auto; border-top:1px solid #ddd; padding-top:7px;"><b>Sanction Details:</b><ul style="padding-left:18px;">`;
        detailList.forEach(item => {
          details += `<li style="margin-bottom:5px;">
            <b>${item.type}:</b> ${item.reference ? item.reference + ' – ' : ''}${item.description || ''}
            <br><span style="font-size:12px;"><i>Targets:</i> ${item.targets || ''}</span>
            <br><a href="${item.full_text_url}" target="_blank" rel="noopener" style="font-size:12px;">Source</a>
          </li>`;
        });
        details += '</ul></div>';
      }
    }

    // Main popup
    return `
      <div style="max-width:370px; max-height:340px; overflow:auto; font-size:15px;">
        <strong>${feature.properties.admin}</strong><br>
        <em>Risk:</em> ${risk}<br>
        <em>Score:</em> ${score}<br>
        ${counts ? counts + '<br>' : ''}
        <a href="${(entry.url || `https://fezqmode.github.io/quadramapdemo/${iso}`)}" target="_blank" rel="noopener">Open Country Page</a>
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
        let score = 0;
        // Show score of subcategory if filtered
        if (currentSubcategory !== 'all' && entry[currentSubcategory] && entry[currentSubcategory].score != null) {
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
        layer.bindPopup(buildPopup(iso, feature), { autoPan: true, maxWidth: 390, className: 'custom-leaflet-popup' });

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

    // Ensure popups always pan into view if they would be cut off by the filter bar
    geoLayer.on('popupopen', function(e) {
      const popup = e.popup;
      const popupPoint = map.latLngToContainerPoint(popup.getLatLng());
      // Adjust the offset for your filter bar (change 130 and 180 as needed)
      if (popupPoint.y < 130) {
        const offset = 180;
        const newPoint = L.point(popupPoint.x, popupPoint.y + offset);
        const newLatLng = map.containerPointToLatLng(newPoint);
        map.panTo(newLatLng, { animate: true });
      }
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
