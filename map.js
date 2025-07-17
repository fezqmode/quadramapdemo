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

  // Load required data
  Promise.all([
    fetch('custom.geo.json').then(r => r.json()),
    fetch('riskData.json').then(r => r.json())
  ]).then(([geo, riskData]) => {
    
    // Create separate layers for each jurisdiction
    const layers = {
      US: L.geoJSON(null, {}),
      EU: L.geoJSON(null, {}),
      UK: L.geoJSON(null, {})
    };

    // Common style and interactivity function
    const geoOpts = {
      style: feature => {
        const iso = feature.properties.iso_a3;
        const entry = riskData[iso] || { score: 0 };
        return {
          fillColor: colorFor(entry.score),
          color: '#444',
          weight: 1,
          opacity: 1,
          fillOpacity: 0.6
        };
      },
      onEachFeature: (feature, layer) => {
        const iso = feature.properties.iso_a3;
        const entry = riskData[iso] || {
          score: 0, risk: 'low',
          eo: 0, det: 0, lic: 0,
          source: 'US',
          url: `https://fezqmode.github.io/quadramapdemo/${iso}`
        };

        const popup = `
          <strong>${feature.properties.admin}</strong><br>
          <em>Score:</em> ${entry.score}<br>
          <em>Risk:</em> ${entry.risk}<br>
          <em>EO:</em> ${entry.eo}, <em>Det:</em> ${entry.det}, <em>Lic:</em> ${entry.lic}<br>
          <a href="${entry.url}" target="_blank" rel="noopener">Open Country Page</a>
        `;
        layer.bindPopup(popup);
        layer.on('click', () => { window.open(entry.url, '_blank'); });

        layer.on('mouseover', () => layer.setStyle({ weight: 2, color: '#000' }));
        layer.on('mouseout', () => layers[entry.source].resetStyle(layer));
      }
    };

    // Add features to the correct jurisdiction layer
    geo.features.forEach(f => {
      const iso = f.properties.iso_a3;
      const entry = riskData[iso] || {};
      const source = entry.source || 'US';
      layers[source].addData(f);
    });

    // Apply options to each layer
    Object.keys(layers).forEach(key => {
      layers[key] = L.geoJSON(layers[key].toGeoJSON(), geoOpts);
    });

    // Add US layer by default
    layers.US.addTo(map);

    // Add layer switch control
    const overlayMaps = {
      "US Risk Data": layers.US,
      "EU Risk Data": layers.EU,
      "UK Risk Data": layers.UK
    };
    L.control.layers(null, overlayMaps, { collapsed: false }).addTo(map);

    // Add color legend
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
