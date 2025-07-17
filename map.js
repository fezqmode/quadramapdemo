document.addEventListener('DOMContentLoaded', () => {
  // base map
  const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  });
  const map = L.map('mapid', {
    center: [20, 0],
    zoom: 2,
    layers: [osm],
    minZoom: 2,
    maxBounds: [[-85,-180],[85,180]]
  });

  // color ramp from green (0) → red (100)
  function colorFor(score) {
    const s = Math.max(0, Math.min(100, +score));
    const r = Math.round(255 * s / 100);
    const g = Math.round(255 * (100 - s) / 100);
    return `rgb(${r},${g},0)`;
  }

  let geoData, riskData;
  let currentJurisdiction = 'US';
  let currentSubcategory = 'all';

  // wire up the two dropdowns
  function setupDropdowns() {
    const j = document.getElementById('jurisdictionSelect');
    const s = document.getElementById('subcategorySelect');
    j.value = currentJurisdiction;
    s.value = currentSubcategory;
    j.addEventListener('change', () => {
      currentJurisdiction = j.value;
      renderMap();
    });
    s.addEventListener('change', () => {
      currentSubcategory = s.value;
      renderMap();
    });
  }

  // build the popup HTML for a feature
  function buildPopup(iso, feature) {
    const entry = (riskData[iso] && riskData[iso][currentJurisdiction]) || {};
    let score, risk, counts = '';

    // pick either the sub‐category or the overall
    if (currentSubcategory !== 'all' && entry[currentSubcategory]) {
      const cat = entry[currentSubcategory];
      score = cat.score != null ? cat.score : entry.score || 0;
      risk  = cat.risk  || entry.risk || 'N/A';
      ['eo','det','lic','reg'].forEach(k => {
        if (k in cat) counts += k.toUpperCase()+': '+cat[k]+', ';
      });
    } else {
      score = entry.score || 0;
      risk  = entry.risk  || 'N/A';
      ['eo','det','lic','reg'].forEach(k => {
        if (k in entry) counts += k.toUpperCase()+': '+entry[k]+', ';
      });
    }
    counts = counts.replace(/, $/, '');

    // details list
    let details = '';
    const list = entry[currentSubcategory]?.details;
    if (currentSubcategory!=='all' && Array.isArray(list) && list.length) {
      details = '<b>Sanction Details:</b><ul style="padding-left:20px">';
      list.forEach(item => {
        details += `<li>
          <b>${item.type}:</b> ${item.reference?item.reference+' – ':''}${item.description||''}<br>
          <b>Targets:</b> ${item.targets||''}<br>
          <a href="${item.full_text_url}" target="_blank">Source</a>
        </li>`;
      });
      details += '</ul>';
    }

    return `
      <div style="max-width:370px">
        <b>${feature.properties.admin}</b><br>
        <b>Risk:</b> ${risk}<br>
        <b>Score:</b> ${score}<br>
        ${counts?counts+'<br>':''}
        <a href="${entry.url||'https://fezqmode.github.io/quadramapdemo/'+iso}" target="_blank">Open Country Page</a>
        <br>${details}
      </div>
    `;
  }

  let geoLayer = null;
  function renderMap() {
    if (geoLayer) map.removeLayer(geoLayer);
    geoLayer = L.geoJSON(geoData, {
      style: f => {
        const iso = f.properties.iso_a3;
        const entry = (riskData[iso] && riskData[iso][currentJurisdiction]) || {};
        let sc = 0;
        if (currentSubcategory!=='all' && entry[currentSubcategory]?.score!=null) {
          sc = entry[currentSubcategory].score;
        } else if (entry.score!=null) {
          sc = entry.score;
        }
        return {
          fillColor: colorFor(sc),
          color: '#444',
          weight: 1,
          fillOpacity: 0.6
        };
      },
      onEachFeature: (f, layer) => {
        const iso = f.properties.iso_a3;
        layer.bindPopup(buildPopup(iso, f), {
          autoPan: true,
          maxWidth:390,
          className:'custom-leaflet-popup'
        });
        layer.on('mouseover', () => {
          if (!layer.isPopupOpen()) layer.openPopup();
          layer.setStyle({weight:2,color:'#000'});
        });
        layer.on('mouseout', () => {
          if (layer.isPopupOpen()) layer.closePopup();
          geoLayer.resetStyle(layer);
        });
        layer.on('click', () => {
          const entry = (riskData[iso] && riskData[iso][currentJurisdiction]) || {};
          window.open(entry.url||`https://fezqmode.github.io/quadramapdemo/${iso}`, '_blank');
        });
      }
    }).addTo(map);
  }

  // load both geo & risk data
  Promise.all([
    // world countries geoJSON (simplified)
    fetch('https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json').then(r=>r.json()),
    fetch('riskData.json').then(r=>r.json())
  ])
  .then(([geo, risk]) => {
    geoData  = geo;
    riskData = risk;
    setupDropdowns();
    renderMap();

    // legend
    const legend = L.control({position:'bottomright'});
    legend.onAdd = () => {
      const div = L.DomUtil.create('div','legend');
      [0,20,40,60,80,100].forEach((v,i,arr) => {
        const next = arr[i+1]||100;
        div.innerHTML +=
          `<i style="background:${colorFor(v)};width:15px;height:10px;display:inline-block;margin-right:6px"></i>
           ${v}–${next}<br>`;
      });
      return div;
    };
    legend.addTo(map);
  })
  .catch(console.error);
});
