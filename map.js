// map.js
document.addEventListener('DOMContentLoaded', () => {
  const map = L.map('mapid').setView([20, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  let metrics = {}, geoLayer;

  // 1) Load all metrics
  fetch('metrics.json')
    .then(r => {
      if (!r.ok) throw new Error('metrics.json load failed: ' + r.status);
      return r.json();
    })
    .then(data => {
      metrics = data;
      initMap();
      initFilters();
    })
    .catch(err => console.error(err));

  // 2) Draw countries once
  function initMap() {
    fetch('custom.geo.json')
      .then(r => r.json())
      .then(geo => {
        geoLayer = L.geoJSON(geo, {
          style: styleFeature,
          onEachFeature: bindFeature
        }).addTo(map);
      })
      .catch(err => console.error(err));
  }

  // 3) Style function uses continuous green→red by score, with grey-out for filtered-out
  function styleFeature(feat) {
    const iso = feat.properties.iso_a3;
    const m   = metrics[iso] || { fatf:'clean', egmont:false, basel:false, cpi:0, score:0, url:'#' };

    // Read filters
    const black = document.getElementById('fatfBlack').checked;
    const grey  = document.getElementById('fatfGrey' ).checked;
    const egm   = document.getElementById('egmont'   ).checked;
    const bas   = document.getElementById('basel'    ).checked;
    const minCpi= +document.getElementById('cpiRange').value;

    // Composite score: you can override to use m.score or normalize CPI etc.
    const ratio = Math.min(Math.max(m.score, 0), 1);

    // Check if feature passes all active filters
    const passes =
      (!black || m.fatf === 'black') &&
      (!grey  || m.fatf === 'grey')  &&
      (!egm   || m.egmont)           &&
      (!bas   || m.basel)            &&
      (m.cpi >= minCpi);

    // Compute fill color: gradient if passes, grey if not
    let fill;
    if (passes) {
      const r = Math.round(255 * ratio);
      const g = Math.round(255 * (1 - ratio));
      fill = `rgb(${r},${g},0)`;
    } else {
      fill = '#ccc';
    }

    return {
      fillColor:   fill,
      color:       passes ? '#333' : '#888',
      weight:      passes ? 1   : 0.5,
      fillOpacity: passes ? 0.6 : 0.3
    };
  }

  // 4) Attach tooltip, hover highlight, click → detail URL
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

  // 5) Wire filters to re-style map on change
  function initFilters() {
    const inputs = Array.from(document.querySelectorAll('#filters input'));
    inputs.forEach(inp => {
      inp.addEventListener('change', () => {
        geoLayer.setStyle(styleFeature);
      });
    });
    // CPI range label update
    const cpiRange = document.getElementById('cpiRange');
    const cpiValue = document.getElementById('cpiValue');
    cpiRange.addEventListener('input', () => {
      cpiValue.textContent = cpiRange.value;
      geoLayer.setStyle(styleFeature);
    });
  }

  // 6) Legend: continuous gradient bar, with Low/High labels
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
