import { tabla1Raw, tabla2Raw } from './segundo-raw.mjs';

const ARMAS = ['Art.', 'Com.', 'Ing.', 'Cab.', 'Inf.', 'San.', 'Int.', 'Mot.', 'MB.', 'Mb.'];
const NUM_RE = /^\d+,\d+$/;

export function parseTabla1() {
  const lines = tabla1Raw.split('\n').map((l) => l.trim()).filter(Boolean);
  const rows = [];
  for (const line of lines) {
    const noNro = line.replace(/^\d+\.-\s*/, '');
    const tokens = noNro.split(/\s+/);
    let armaIdx = -1;
    for (let i = 0; i < tokens.length; i++) {
      if (ARMAS.includes(tokens[i])) armaIdx = i;
    }
    if (armaIdx === -1) throw new Error(`No se encontro arma en linea: ${line}`);
    let numStart = tokens.length;
    for (let i = armaIdx + 1; i < tokens.length; i++) {
      if (NUM_RE.test(tokens[i])) {
        numStart = i;
        break;
      }
    }
    const name = tokens.slice(armaIdx + 1, numStart).join(' ');
    const nums = tokens.slice(numStart).map((t) => parseFloat(t.replace(',', '.')));
    if (nums.length < 7) throw new Error(`Fila con menos de 7 numeros (esperado PROM+6 materias): ${line}`);
    const materias = nums.slice(nums.length - 6); // EXPRESION, DOCUMENTACION, ARCHIVISTICA, ETIQUETA, SERVICIO, INTELIGENCIA
    const promArmas = nums[nums.length - 7];
    rows.push({ name, promArmas, materias, rawCount: nums.length });
  }
  return rows;
}

export function parseTabla2() {
  const lines = tabla2Raw.split('\n').map((l) => l.trim()).filter(Boolean);
  const rows = [];
  for (const line of lines) {
    const tokens = line.split(/\s+/);
    const antig = tokens[tokens.length - 1];
    const atrib = tokens[tokens.length - 2];
    const numTokens = tokens.slice(0, tokens.length - 2);
    if (numTokens.length !== 17) throw new Error(`Se esperaban 17 campos numericos, se hallaron ${numTokens.length}: ${line}`);
    const nums = numTokens.map((t) => parseFloat(t.replace(',', '.')));
    const materias5 = nums.slice(0, 5); // ADMIN_RIESGO, GESTION_RIESGOS, ADMIN_PPMMAA, MONOGRAFIAS, TAEKWONDO
    const antigNum = parseInt(antig.split('/')[0], 10);
    rows.push({ materias5, atrib, antig, antigNum });
  }
  return rows;
}
