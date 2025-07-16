// map.js (debug version)
document.addEventListener('DOMContentLoaded', () => {
  const map = L.map('mapid').setView([20,0],2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
  fetch('custom.geo.json')
    .then(r=>r.json())
    .then(geo => L.geoJSON(geo, {
      style: { fillColor:'#00ff00', color:'#333', weight:1, fillOpacity:0.6 }
    }).addTo(map))
    .catch(console.error);
});
