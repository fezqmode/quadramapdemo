// map.js
document.addEventListener('DOMContentLoaded', ()=> {
  const map = L.map('mapid').setView([20,0],2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:'© OpenStreetMap contributors'
  }).addTo(map);

  fetch('custom.geo.json')
    .then(r => {
      if(!r.ok) throw new Error('GeoJSON load failed '+r.status);
      return r.json();
    })
    .then(data => {
      L.geoJSON(data).addTo(map);
      console.log('GeoJSON loaded, features:', data.features.length);
    })
    .catch(e => console.error(e));
});
