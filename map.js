// map.js

document.addEventListener('DOMContentLoaded', () => {
  // Show a simple loading spinner/message
  const loadingDiv = document.createElement('div');
  loadingDiv.id = 'loading-spinner';
  loadingDiv.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    display: flex; align-items: center; justify-content: center;
    background: rgba(255,255,255,0.92); z-index: 4000; font-size: 2rem; color: #135db4;
  `;
  loadingDiv.textContent = 'Loading map...';
  document.body.appendChild(loadingDiv);

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

  // Helper: color ramp for scores (0=green, 100=red, no data=grey)
  function colorFor(score, hasData) {
    if (!hasData) return '#bbb'; // neutral grey for "no data"
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
    let score, risk, counts = '';
    let hasData = true;

    // Use subcategory for counts, fallback to aggregate if not available
    let cat = (currentSubcategory !== 'all' && entry[currentSubcategory]) ? entry[currentSubcategory] : entry;

    // Determine score and risk
    if (cat && (typeof cat.score === 'number' || typeof cat.score === 'string')) {
      score = cat.score;
      risk = cat.risk || entry.risk || 'N/A';
    } else if (typeof entry.score === 'number' || typeof entry.score === 'string') {
      score = entry.score;
      risk = entry.risk || 'N/A';
    } else {
      hasData = false;
      score = 'No data';
      risk = 'No data';
    }

    // Sanction counts (only if present)
    if (hasData) {
      if ('eo' in cat) counts += `<em>EO:</em> ${cat.eo}, `;
      if ('det' in cat) counts += `<em>Det:</em> ${cat.det}, `;
      if ('lic' in cat) counts += `<em>Lic:</em> ${cat.lic}, `;
      if ('reg' in cat) counts += `<em>Reg:</em> ${cat.reg}, `;
      counts = counts.replace(/, $/, '');
    }

    // Subcategory specific details
    let details = '';
    if (hasData && currentSubcategory !== 'all' && Array.isArray(cat.details) && cat.details.length > 0) {
      details = `<div style="margin-top:8px; max-height:250px; overflow:auto; border-top:1px solid #ddd; padding-top:7px;"><b>Sanction Details:</b><ul style="padding-left:18px;">`;
      cat.details.forEach(item => {
        details += `<li style="margin-bottom:5px;">
          <b>${item.type}:</b> ${item.reference ? item.reference + ' – ' : ''}${item.description || ''}
          <br><span style="font-size:12px;"><i>Targets:</i> ${item.targets || ''}</span>
          <br><a href="${item.full_text_url}" target="_blank" rel="noopener" style="font-size:12px;">Source</a>
        </li>`;
      });
      details += '</ul></div>';
    }

    // Main popup
    return `
      <div style="max-width:370px; max-height:340px; overflow:auto; font-size:15px;">
        <strong>${feature.properties.admin}</strong><br>
        <em>Risk:</em> ${risk}<br>
        <em>Score:</em> ${score}<br>
        ${counts ? counts + '<br>' : ''}
        <a href="country.html?iso=${iso}&jurisdiction=${currentJurisdiction}&category=${currentSubcategory}" target="_blank" rel="noopener">Open Country Page</a>
        ${details}
        ${!hasData ? `<div style="margin-top:8px; color:#888;"><em>No sanctions data for this country/jurisdiction.</em></div>` : ''}
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
        let cat = (currentSubcategory !== 'all' && entry[currentSubcategory]) ? entry[currentSubcategory] : entry;
        let hasData = typeof (cat && cat.score) !== 'undefined' && cat.score !== null;
        let score = hasData ? cat.score : 0;
        return {
          fillColor: colorFor(score, hasData),
          color: '#444',
          weight: 1,
          opacity: 1,
          fillOpacity: 0.6
        };
      },
      onEachFeature: function(feature, layer) {
        const iso = feature.properties.iso_a3;
        layer.bindPopup(buildPopup(iso, feature), { autoPan: true, maxWidth: 390, className: 'custom-leaflet-popup' });

        // -- Popup behavior: open on click --
        layer.on('click', function(e) {
          layer.openPopup();
          map.panTo(e.latlng);
        });

        // Optionally: open popup on mouseover (uncomment to enable)
        // layer.on('mouseover', function(e) {
        //   if (!layer.isPopupOpen()) {
        //     layer.openPopup();
        //   }
        // });
        // layer.on('mouseout', function(e) {
        //   layer.closePopup();
        // });
      }
    });

    geoLayer.addTo(map);
  }

  // --- Data Loading with Error Handling and Cache Busting ---
  Promise.all([
    fetch('custom.geo.json?v=20240717').then(r => {
      if (!r.ok) throw new Error('custom.geo.json failed to load');
      return r.json();
    }),
    fetch('riskData.json?v=20240717').then(r => {
      if (!r.ok) throw new Error('riskData.json failed to load');
      return r.json();
    })
  ])
  .then(([geo, risk]) => {
    geoData = geo;
    riskData = risk;
    setupDropdowns();
    renderMap();
    // Remove loading spinner
    if (loadingDiv && loadingDiv.parentNode) loadingDiv.parentNode.removeChild(loadingDiv);
  })
  .catch(err => {
    if (loadingDiv && loadingDiv.parentNode) loadingDiv.parentNode.removeChild(loadingDiv);
    alert('Error loading map data. Please refresh the page or contact the site administrator.');
    console.error('Map data load error:', err);
  });

});
