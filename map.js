// map.js
const map = L.map('map').setView([20,0],2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OSM'}).addTo(map);

let data;
Promise.all([
  fetch('riskData_enriched.json').then(r=>r.json()),
  fetch('custom.geo.json').then(r=>r.json())
]).then(([risk,geo])=>{
  data = risk;
  L.geoJSON(geo, { style, onEachFeature }).addTo(map);
  addLegend();
});

function getColor(score){
  return score>80 ? '#800026' :
         score>60 ? '#BD0026' :
         score>40 ? '#E31A1C' :
         score>20 ? '#FC4E2A' :
         score>0  ? '#FD8D3C' :
                    '#FFEDA0';
}

function style(feature){
  const iso = feature.properties.ISO_A3;
  const sc = (data[iso]||{}).score||0;
  return {
    fillColor: getColor(sc),
    weight:1, color:'#444', fillOpacity:0.7
  };
}

function onEachFeature(f,layer){
  const iso = f.properties.ISO_A3;
  const ent = data[iso]||{};
  const html = `
    <strong>${f.properties.ADMIN}</strong><br/>
    Score: ${ent.score||0} (${ent.risk||'n/a'})<br/>
    EOs: ${ent.eo_count||0}, Dets: ${ent.det_count||0}, Lic: ${ent.license_count||0}
  `;
  layer.bindTooltip(html,{sticky:true});
  layer.on('click',()=>{
    if(ent.ofac_url) window.open(ent.ofac_url,'_blank');
  });
}

function addLegend(){
  const grades=[0,20,40,60,80];
  const div=L.DomUtil.create('div','legend');
  grades.forEach((g,i)=>{
    div.innerHTML +=
      `<i style="background:${getColor(g+1)}"></i> ${g}${grades[i+1]?('&ndash;'+grades[i+1]):+'+'}<br>`;
  });
  L.control({position:'bottomright'}).onAdd(()=>div).addTo(map);
}
