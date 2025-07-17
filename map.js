// map.js
document.addEventListener('DOMContentLoaded', () => {
  const map = L.map('mapid').setView([20, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  let riskData = {};

  // 1. load enriched JSON
  fetch('riskData_enriched.json')
    .then(res => {
      if (!res.ok) throw new Error('Could not load enriched data: ' + res.status);
      return res.json();
    })
    .then(data => {
      riskData = data;
      drawCountries();
      addLegend();
    })
    .catch(err => {
      console.error(err);
      // fallback to original
      console.warn('Falling back to riskData.json');
      return fetch('riskData.json')
        .then(r => r.json())
        .then(d => { riskData = d; drawCountries(); addLegend(); });
    });

  // 2. draw GeoJSON
  function drawCountries() {
    fetch('custom.geo.json')
      .then(res => res.json())
      .then(geo => {
        L.geoJSON(geo, {
          style: styleByFeature,
          onEachFeature: attachInteractions
        }).addTo(map);
      })
      .catch(err => console.error('GeoJSON load failed', err));
  }

  // 3. style by risk (using enriched or fallback data)
  function styleByFeature(f) {
    const iso   = (f.properties.iso_a3 || f.properties.ISO_A3 || '').toUpperCase();
    const ent   = riskData[iso] || {};
    const risk  = ent.risk || 'low';
    const cols  = { high:'#ff0000', medium:'#ffa500', low:'#00ff00' };
    return {
      fillColor:   cols[risk] || cols.low,
      color:       '#333', weight:1, fillOpacity:0.6
    };
  }

  // 4. bind tooltip, hover & click
  function attachInteractions(f, layer) {
    const iso   = (f.properties.iso_a3 || f.properties.ISO_A3 || '').toUpperCase();
    const name  = f.properties.admin || f.properties.ADMIN || iso;
    const ent   = riskData[iso] || {};

    // build tooltip with safe defaults
    const lines = [
      `<strong>${name}</strong>`,
      `Risk: ${ent.risk ? ent.risk.charAt(0).toUpperCase()+ent.risk.slice(1) : 'Unknown'}`,
      `Score: ${ent.score != null ? ent.score : '—'}`,
      `EOs: ${ent.eo_count != null ? ent.eo_count : '—'}`,
      `Dets: ${ent.det_count != null ? ent.det_count : '—'}`,
      `Licenses: ${ent.license_count != null ? ent.license_count : '—'}`
    ];
    layer.bindTooltip(lines.join('<br>'), { sticky:true });

    layer.on('mouseover', () => {
      layer.setStyle({ weight:3, fillOpacity:0.8 });
      layer.bringToFront();
    });
    layer.on('mouseout',  () => {
      layer.setStyle(styleByFeature(f));
    });
    layer.on('click', () => {
      if (ent.ofac_url) window.open(ent.ofac_url, '_blank');
    });
  }

  // 5. legend
  function addLegend() {
    const legend = L.control({ position:'bottomright' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div','legend');
      div.innerHTML = `
        <i style="background:#ff0000"></i> High<br>
        <i style="background:#ffa500"></i> Medium<br>
        <i style="background:#00ff00"></i> Low
      `;
      return div;
    };
    legend.addTo(map);
  }
});
