document.addEventListener('DOMContentLoaded', () => {
  // 1️⃣ Initialize base map
  const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  });
  const map = L.map('mapid', {
    center: [20, 0],
    zoom: 2,
    layers: [osm],
    minZoom: 2,
    maxBounds: [[-85, -180], [85, 180]],
    scrollWheelZoom: true
  });

  // 2️⃣ Color function: green (0) → red (100)
  function colorFor(score) {
    const s = Math.max(0, Math.min(100, +score));
    const r = Math.round(255 * s   / 100);
    const g = Math.round(255 * (100 - s) / 100);
    return `rgb(${r},${g},0)`;
  }

  let geoData, riskData;
  let currentJurisdiction = 'US';
  let currentSubcategory  = 'all';

  // 3️⃣ Wire up the two dropdowns
  function setupDropdowns() {
    const jSel = document.getElementById('jurisdictionSelect');
    const sSel = document.getElementById('subcategorySelect');
    jSel.value = currentJurisdiction;
    sSel.value = currentSubcategory;
    jSel.addEventListener('change', () => {
      currentJurisdiction = jSel.value;
      renderMap();
    });
    sSel.addEventListener('change', () => {
      currentSubcategory = sSel.value;
      renderMap();
    });
  }

  // 4️⃣ Build the popup HTML for one country
  function buildPopup(iso, feature) {
    const entry = (riskData[iso] && riskData[iso][currentJurisdiction]) || {};
    let score, risk, counts = '';
    // pick subcategory or fallback to overall
    if (currentSubcategory !== 'all' && entry[currentSubcategory]) {
      const cat = entry[currentSubcategory];
      score = cat.score ?? entry.score ?? 0;
      risk  = cat.risk  || entry.risk || 'N/A';
      ['eo','det','lic','reg'].forEach(k => {
        if (k in cat) counts += `${k.toUpperCase()}: ${cat[k]}, `;
      });
    } else {
      score = entry.score ?? 0;
      risk  = entry.risk  || 'N/A';
      ['eo','det','lic','reg'].forEach(k => {
        if (k in entry) counts += `${k.toUpperCase()}: ${entry[k]}, `;
      });
    }
    counts = counts.replace(/, $/, '');

    // optional detailed list of sanctions
    let details = '';
    const list = entry[currentSubcategory]?.details;
    if (currentSubcategory !== 'all' && Array.isArray(list) && list.length) {
      details = '<b>Details:</b><ul>';
      list.forEach(item => {
        details += `<li><b>${item.type}:</b> ${item.reference||''} – ${item.description||''}
          <br><b>Targets:</b> ${item.targets||''}
          <br><a href="${item.full_text_url}" target="_blank">Source</a>
        </li>`;
      });
      details += '</ul>';
    }

    return `
      <div style="max-width:350px">
        <b>${feature.properties.admin}</b>
        <br><b>Risk:</b> ${risk}
        <br><b>Score:</b> ${score}
        ${counts ? `<br>${counts}` : ''}
        <br><a href="${entry.url||`https://fezqmode.github.io/quadramapdemo/${iso}`}" target="_blank">More…</a>
        ${details}
      </div>`;
  }

  let geoLayer = null;

  // 5️⃣ Actually draw the countries, color them, bind popup & events
  function renderMap() {
    if (geoLayer) map.removeLayer(geoLayer);
    geoLayer = L.geoJSON(geoData, {
      style: feature => {
        const iso = feature.properties.iso_a3;
        const entry = (riskData[iso]?.[currentJurisdiction]) || {};
        const score = ( currentSubcategory !== 'all' && entry[currentSubcategory]?.score != null
                        ? entry[currentSubcategory].score
                        : (entry.score ?? 0) );
        return {
          fillColor:   colorFor(score),
          color:       '#444',
          weight:      1,
          fillOpacity: 0.6
        };
      },
      onEachFeature: (feature, layer) => {
        const iso = feature.properties.iso_a3;
        layer.bindPopup(buildPopup(iso, feature), { maxWidth: 370 });
        layer.on('mouseover', () => {
          layer.openPopup();
          layer.setStyle({ weight: 2, color: '#000' });
        });
        layer.on('mouseout',  () => {
          layer.closePopup();
          geoLayer.resetStyle(layer);
        });
        layer.on('click',    () => {
          const url = riskData[iso]?.[currentJurisdiction]?.url
                    || `https://fezqmode.github.io/quadramapdemo/${iso}`;
          window.open(url, '_blank');
        });
      }
    }).addTo(map);
  }

  // 6️⃣ Load your country-shape GeoJSON + the riskData JSON
  Promise.all([
    fetch('custom.geo.json').then(r => r.json()),
    fetch('riskData.json').then(r => r.json())
  ]).then(([geo, risk]) => {
    geoData  = geo;
    riskData = risk;
    setupDropdowns();
    renderMap();

    // 7️⃣ Simple legend control
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div','legend');
      [0,20,40,60,80,100].forEach((v,i,arr) => {
        const nxt = arr[i+1]||100;
        div.innerHTML +=
          `<i style="background:${colorFor(v)};width:15px;height:10px;display:inline-block"></i> ${v}–${nxt}<br>`;
      });
      return div;
    };
    legend.addTo(map);

  }).catch(err => console.error('Map load error:', err));
});
