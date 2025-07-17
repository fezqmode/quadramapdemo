document.addEventListener('DOMContentLoaded', () => {
  const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  });
  const map = L.map('mapid', {
    center: [20, 0],
    zoom: 2,
    layers: [osm],
    zoomControl: true,
    scrollWheelZoom: true,
    minZoom: 2,
    maxBounds: [
      [-85, -180],
      [85, 180]
    ]
  });

  function colorFor(score) {
    const s = Math.max(0, Math.min(100, +score));
    const r = Math.round(255 * s / 100);
    const g = Math.round(255 * (100 - s) / 100);
    return `rgb(${r},${g},0)`;
  }

  let geoData, riskData;
  let currentJurisdiction = 'US';
  let currentSubcategory = 'all';

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

  function buildPopup(iso, feature) {
    const entry = (riskData[iso] && riskData[iso][currentJurisdiction]) || {};
    let score, risk, counts = '';
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

    // Details section
    let details = '';
    if (currentSubcategory !== 'all' && entry[currentSubcategory] && Array.isArray(entry[currentSubcategory].details)) {
      const detailList = entry[currentSubcategory].details;
      if (detailList.length > 0) {
        details = '<b>Sanction Details:</b><ul style="padding-left:20px">';
        detailList.forEach(item => {
          details += `<li><b>${item.type}:</b> ${item.reference ? item.reference + ' – ' : ''}${item.description || ''}<br>
          <b>Targets:</b> ${item.targets || ''}<br>
          <a href="${item.full_text_url}" target="_blank">Source</a></li>`;
        });
        details += '</ul>';
      }
    }

    return `
      <div style="max-width:370px;">
        <b>${feature.properties.admin}</b><br>
        <b>Risk:</b> ${risk}<br>
        <b>Score:</b> ${score}<br>
        ${counts ? counts + '<br>' : ''}
        <a href="https://fezqmode.github.io/quadramapdemo/${iso}" target="_blank">Open Country Page</a>
        <br>${details}
      </div>
    `;
  }

  let geoLayer = null;

  function renderMap() {
    if (geoLayer) { map.removeLayer(geoLayer); }
    geoLayer = L.geoJSON(geoData, {
      style: function(feature) {
        const iso = feature.properties.iso_a3;
        const entry = (riskData[iso] && riskData[iso][currentJurisdiction]) || {};
        let score = 0;
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
        layer.bindPopup(buildPopup(iso, feature), {
          autoPan: true,
          maxWidth: 390,
          className: 'custom-leaflet-popup'
        });
        // Mouseover: open popup
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
        div.innerHTML += `<i style="background:${colorFor(v)};width:15px;height:10px;display:inline-block;margin-right:6px;"></i> ${v}–${next}<br>`;
      });
      return div;
    };
    legend.addTo(map);
  }).catch(err => {
    console.error('Map error:', err);
  });
});
