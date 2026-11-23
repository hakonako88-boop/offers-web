// Match reviewed catalogue records, not mentions in accessories or bundles.
const catalogue = [
  {ids:['awin-20982-29405188815'],model:'G102 LIGHTSYNC',brand:'Logitech G',source:'https://www.logitechg.com/en-ph/shop/p/g102-lightsync-rgb-gaming-mouse',facts:['Sensibilidad ajustable de 200 a 8.000 DPI.','Seis botones y conexión por cable.','Iluminación RGB personalizable mediante Logitech G HUB.']},
  {ids:['1005009579958845','1005010044708756'],model:'WH-1000XM6',brand:'Sony',source:'https://www.sony.es/electronics/support/wireless-headphones-bluetooth-headphones/wh-1000xm6/specifications',facts:['Música: hasta 30 horas con cancelación de ruido o 40 horas sin ella.','Peso aproximado: 254 g.','Conexión Bluetooth multipunto.','Carga completa en unas 3,5 horas.']},
  {ids:['1005013061014079'],model:'Osmo Action 5 Pro',brand:'DJI',source:'https://www.dji.com/osmo-action-5-pro/specs',facts:['Sensor CMOS de 1/1,3 pulgadas.','Objetivo de 155° con apertura f/2,8.','Grabación estándar en 4K hasta 120 fps, en 16:9 y 4:3.','Enfoque desde 35 cm hasta infinito.']},
];
export function verifiedProductSpecs(id,title) {
  return catalogue.find(row=>row.ids.includes(String(id)) && String(title).toLowerCase().includes(row.model.toLowerCase())) || null;
}
