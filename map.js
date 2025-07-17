// map.js

document.addEventListener('DOMContentLoaded', () => {
  const map = L.map('mapid').setView([20, 0], 2);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  function colorFor(score) {
    const s = Math.max(0, Math.min(100, +score));
    const r = Math.round(255 * s/100);
    const g = Math.round(255 * (100-s)/100);
    return `rgb(${r},${g},0)`;
  }

  fetch('custom.geo.json')
    .then(r => r.json())
    .then(geo => Promise.all([
      Promise.resolve(geo),
      fetch('riskData.json').then(r => r.json())
    ]))
    .then(([geo, riskData]) => {
      const geoLayer = L.geoJSON(geo, {
        style: feature => {
          const iso = feature.properties.iso_a3;
          const entry = riskData[iso] || { score: 0 };
          return {
            fillColor:   colorFor(entry.score),
            color:       '#444',
            weight:      1,
            opacity:     1,
            fillOpacity: 0.6
          };
        },
        onEachFeature: (feature, layer) => {
          const iso = feature.properties.iso_a3;
          const entry = riskData[iso] || {
            score: 0, risk: 'low',
            eo:0, det:0, lic:0,
            url: `https://fezqmode.github.io/quadramapdemo/${iso}`
          };

          const popup = `
            <strong>${feature.properties.admin}</strong><br>
            <em>Score:</em> ${entry.score}<br>
            <em>Risk:</em> ${entry.risk}<br>
            <em>EO:</em> ${entry.eo}, <em>Det:</em> ${entry.det}, <em>Lic:</em> ${entry.lic}<br>
            <a href="${entry.url}" target="_blank" rel="noopener">View Country Page</a>
          `;
          layer.bindPopup(popup);

          layer.on('click', () => {
            window.open(entry.url, '_blank');
          });

          layer.on('mouseover', () => {
            layer.setStyle({ weight: 2, color: '#000' });
          });
          layer.on('mouseout', () => {
            geoLayer.resetStyle(layer);
          });
        }
      }).addTo(map);

      // Legend
      const legend = L.control({ position: 'bottomright' });
      legend.onAdd = () => {
        const div = L.DomUtil.create('div', 'legend');
        [0,20,40,60,80,100].forEach((v,i,arr) => {
          const next = arr[i+1] || 100;
          div.innerHTML +=
            `<i style="background:${colorFor((v+next)/2)}"></i> ${v}&ndash;${next}<br>`;
        });
        return div;
      };
      legend.addTo(map);
    })
    .catch(e => console.error('Map load failed:', e));
});
