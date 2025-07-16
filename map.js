// map.js
document.addEventListener('DOMContentLoaded', () => {
  const map = L.map('mapid').setView([20, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  let metrics = {}, geoLayer;

  // Load the extended riskData.json
  fetch('riskData.json')
    .then(r => {
      if (!r.ok) throw new Error('riskData.json load failed: ' + r.status);
      return r.json();
    })
    .then(data => {
      metrics = data;
      initMap();
      initFilters();
    })
    .catch(err => console.error(err));

  // Draw countries once
  function initMap() {
    fetch('custom.geo.json')
      .then(r => r.json())
      .then(geo => {
        geoLayer = L.geoJSON(geo, {
          style: styleFeature,
          onEachFeature: bindFeature
        }).addTo(map);
        addLegend();
      })
      .catch(err => console.error(err));
  }

  // Style by continuous gradient + filters
  function styleFeature(feat) {
    const iso   = feat.properties.iso_a3;
    const m     = metrics[iso] || {};
    const ratio = Math.min(Math.max(m.score || 0, 0), 1);

    // Read active filters
    const black = document.getElementById('fatfBlack').checked;
    const grey  = document.getElementById('fatfGrey' ).checked;
    const egm   = document.getElementById('egmont'   ).checked;
    const bas   = document.getElementById('basel'    ).checked;
    const minCpi= +document.getElementById('cpiRange').value;

    // Check all filters
    const ok =
      (!black || m.fatf   === 'black') &&
      (!grey  || m.fatf   === 'grey')  &&
      (!egm   || m.egmont === true)   &&
      (!bas   || m.basel  === true)   &&
      (m.cpi   >= minCpi);

    // Compute color
    let fill;
    if (ok) {
      const r = Math.round(255 * ratio);
      const g = Math.round(255 * (1 - ratio));
      fill = `rgb(${r},${g},0)`;
    } else {
      fill = '#ccc';
    }

    return {
      fillColor:   fill,
      color:       ok ? '#333' : '#888',
      weight:      ok ? 1 : 0.5,
      fillOpacity: ok ? 0.7 : 0.3
    };
  }

  // Tooltip, hover, click → url
  function bindFeature(feat, layer) {
    const name = feat.properties.admin || feat.properties.ADMIN;
    layer.bindTooltip(name, { sticky: true });

    layer.on('mouseover', () => {
      layer.setStyle({ weight: 3, fillOpacity: 0.8 });
      layer.bringToFront();
    });
    layer.on('mouseout', () => {
      layer.setStyle(styleFeature(feat));
    });

    layer.on('click', () => {
      const iso = feat.properties.iso_a3;
      const url = (metrics[iso] && metrics[iso].url) || '#';
      if (url !== '#') window.open(url, '_blank');
    });
  }

  // Wire filter inputs to re-style
  function initFilters() {
    const inputs = [...document.querySelectorAll('#filters input')];
    inputs.forEach(i => i.addEventListener('change', () => {
      geoLayer.setStyle(styleFeature);
    }));
    const cpiRange = document.getElementById('cpiRange');
    const cpiValue = document.getElementById('cpiValue');
    cpiRange.addEventListener('input', () => {
      cpiValue.textContent = cpiRange.value;
      geoLayer.setStyle(styleFeature);
    });
  }

  // Add a continuous gradient legend
  function addLegend() {
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'legend');
      div.innerHTML = `
        <div style="
          width:120px;
          height:10px;
          background: linear-gradient(to right, #00ff00, #ff0000);
          margin-bottom:4px">
        </div>
        <span>Low Risk</span>
        <span style="float:right">High Risk</span>
      `;
      return div;
    };
    legend.addTo(map);
  }
});
