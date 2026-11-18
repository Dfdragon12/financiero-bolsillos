/**
 * Bolsillos — puente entre la app del iPhone y Google Sheets
 * Diego · sistema 50/30/20 de tres bolsillos
 *
 * Despliegue: Implementar → Gestionar implementaciones → lápiz → Versión: "Nueva versión"
 *   (así la URL no cambia). Ejecutar como: Yo · Acceso: Cualquier usuario.
 * IMPORTANTE: cada vez que edites este código debes crear una NUEVA VERSIÓN
 * al desplegar, o el endpoint sigue sirviendo el código viejo.
 *
 * Seguridad: si defines la propiedad del script TOKEN
 * (Configuración del proyecto → Propiedades del script), toda llamada
 * tiene que traer ?token=<el mismo valor>. Sin TOKEN definido, no se exige.
 * El token NUNCA va en este archivo: el repo es público.
 */

var HOJA_MOV = 'Movimientos';
var HOJA_EST = 'Estado';

var COLS = ['id','fecha','timestamp','categoria','grupo','nota','fuente','juicio','tipo','valor'];

var GRUPOS = {
  'Comida':'Alimentación','Transporte':'Transporte','Parqueadero':'Transporte',
  'Gasolina':'Transporte','Peaje':'Transporte','GoPass':'Transporte','TuLlave':'Transporte',
  'Farmacia':'Salud','Salud':'Salud','Psicólogo':'Salud','Deporte':'Deporte',
  'Ocio':'Ocio','Restaurante':'Ocio','Starbucks':'Ocio','Eventos':'Ocio',
  'Regalos':'Regalos','Compras':'Otros','Pagos':'Otros','Deuda':'Deudas',
  'Ingreso':'Ingreso','Reintegro':'Reintegro'
};

/* Claves del bloque Estado, en orden fijo. Las de texto se guardan como texto
   para que Sheets no las convierta en fechas. */
var CLAVES = ['B1','B2','B3','tcSaldo','deudaPagadas','fondo','lastQ',
              'welliSaldo','welliPagadas','welliCuota','welliFijo','welliTasa','welliDesde','welliDia'];
var TEXTO = { lastQ: true, welliDesde: true };

/**
 * POST — es la vía que usa el Atajo de iOS.
 * En "Obtener contenido de la URL" pones Método POST, Solicitud: Formulario,
 * y cada dato va en su propio campito (incluido "token" si lo activaste).
 */
function doPost(e) {
  return doGet(e);
}

function doGet(e) {
  var p = (e && e.parameter) ? e.parameter : {};
  var cb = p.callback || '';
  var out;
  try {
    if (!p.action) {
      out = { ok: true, msg: 'Bolsillos activo', hora: new Date().toISOString() };
    } else if (!autorizado(p)) {
      out = { ok: false, error: 'no autorizado' };
    } else {
      switch (p.action) {
        case 'push':   out = push(p);   break;
        case 'borrar': out = borrar(p); break;
        case 'estado': out = estado(p); break;
        case 'pull':   out = pull();    break;
        default:       out = { ok: false, error: 'acción desconocida' };
      }
    }
  } catch (err) {
    out = { ok: false, error: String(err) };
  }
  // el callback de JSONP solo puede ser un nombre de función, nada más
  if (cb && !/^[A-Za-z_$][\w$]{0,40}$/.test(cb)) cb = '';
  var json = JSON.stringify(out);
  if (cb) {
    return ContentService
      .createTextOutput(cb + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

/** Compara el token sin cortar en el primer carácter distinto. */
function autorizado(p) {
  var esperado = PropertiesService.getScriptProperties().getProperty('TOKEN');
  if (!esperado) return true;                   // sin TOKEN definido no se exige
  var dado = String(p.token || '');
  if (dado.length !== esperado.length) return false;
  var dif = 0;
  for (var i = 0; i < esperado.length; i++) dif |= dado.charCodeAt(i) ^ esperado.charCodeAt(i);
  return dif === 0;
}

/* ---------- hojas ---------- */

function hojaMov() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(HOJA_MOV);
  if (!sh) {
    sh = ss.insertSheet(HOJA_MOV);
    sh.getRange(1, 1, 1, COLS.length).setValues([COLS])
      .setFontWeight('bold').setBackground('#1f1e1c').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    sh.setColumnWidth(1, 110); sh.setColumnWidth(6, 220);
  }
  return sh;
}

function hojaEst() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(HOJA_EST);
  if (!sh) {
    sh = ss.insertSheet(HOJA_EST);
    sh.getRange(1, 1, 1, 2).setValues([['clave', 'valor']])
      .setFontWeight('bold').setBackground('#1f1e1c').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  return sh;
}

/* ---------- acciones ---------- */

/**
 * Limpia un monto que puede llegar de cualquier forma.
 * El Atajo de Wallet manda cosas como "$54.000", "54.000,00" o "COP 54000".
 * Todas deben terminar en 54000.
 */
function limpiarMonto(v) {
  if (v === undefined || v === null) return 0;
  var s = String(v).replace(/[^\d,.\-]/g, '');   // fuera símbolos y letras
  if (s === '') return 0;
  // si hay coma decimal al final (formato colombiano "54.000,50"), córtala
  var coma = s.lastIndexOf(',');
  if (coma > -1 && s.length - coma <= 3) s = s.substring(0, coma);
  s = s.replace(/[.,]/g, '');                    // los puntos son separadores de miles
  var n = parseInt(s, 10);
  return isNaN(n) ? 0 : Math.abs(n);
}

/** Normaliza la fecha: acepta YYYY-MM-DD o DD/MM/YYYY. */
function limpiarFecha(v) {
  var s = String(v || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  var m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  }
  return Utilities.formatDate(new Date(), 'America/Bogota', 'yyyy-MM-dd');
}

function push(p) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var val = limpiarMonto(p.val);
    if (!val) return { ok: false, error: 'Monto inválido: ' + p.val };

    var sh = hojaMov();
    var last = sh.getLastRow();

    // el id es obligatorio: sin él no hay forma de evitar duplicados ni de borrar
    var id = String(p.id || '').trim();
    if (!id) id = 'gen-' + new Date().getTime() + '-' + Math.floor(Math.random() * 10000);

    // evitar duplicados si el teléfono o el Atajo reintentan
    if (last > 1) {
      var ids = sh.getRange(2, 1, last - 1, 1).getValues();
      for (var i = 0; i < ids.length; i++) {
        if (String(ids[i][0]) === id) {
          return { ok: true, dup: true, id: id };
        }
      }
    }

    var cat = String(p.cat || 'Compras');
    if (!GRUPOS[cat]) cat = 'Compras';
    var src = String(p.src || 'B1').toUpperCase();
    if (['B1', 'B2', 'B3', 'TC'].indexOf(src) < 0) src = 'B1';

    sh.appendRow([
      id,
      limpiarFecha(p.f),
      p.ts || new Date().toISOString(),
      cat,
      GRUPOS[cat] || 'Otros',
      String(p.nota || '').substring(0, 120),
      src,
      p.nec === 'nec' ? 'nec' : 'evi',
      p.tipo === 'ingreso' || p.tipo === 'pagoTC' ? p.tipo : 'gasto',
      val
    ]);
    SpreadsheetApp.flush();
    return { ok: true, id: id, val: val, src: src, fila: sh.getLastRow() };
  } finally {
    lock.releaseLock();
  }
}

function borrar(p) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = hojaMov();
    var last = sh.getLastRow();
    if (last < 2) return { ok: true, vacia: true };
    var ids = sh.getRange(2, 1, last - 1, 1).getValues();
    for (var i = ids.length - 1; i >= 0; i--) {
      if (String(ids[i][0]) === String(p.id)) {
        sh.deleteRow(i + 2);
        return { ok: true, borrado: p.id };
      }
    }
    return { ok: true, noEncontrado: true };  // ya no estaba: se considera resuelto
  } finally {
    lock.releaseLock();
  }
}

/**
 * Reescribe el bloque de estado completo, en orden fijo y sin duplicados.
 * Va con lock: dos llamadas simultáneas del teléfono duplicaban las claves.
 * Se autocorrige — si la hoja ya trae filas repetidas, las limpia.
 */
function estado(p) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = hojaEst();

    // 1. leer lo que hay (si hay repetidas, gana la última escrita)
    var actual = {};
    var last = sh.getLastRow();
    if (last > 1) {
      var v = sh.getRange(2, 1, last - 1, 2).getValues();
      for (var i = 0; i < v.length; i++) {
        if (String(v[i][0])) actual[String(v[i][0])] = v[i][1];
      }
    }

    // 2. aplicar lo que llega del teléfono
    CLAVES.forEach(function (k) {
      if (p[k] === undefined) return;
      actual[k] = TEXTO[k] ? String(p[k]) : (Number(p[k]) || 0);
    });

    // 3. reescribir limpio (el apóstrofo deja el texto como texto)
    if (last > 1) sh.getRange(2, 1, last - 1, 2).clearContent();
    var filas = CLAVES.map(function (k) {
      var x = actual[k];
      if (x === undefined || x === null) x = '';
      if (TEXTO[k] && x !== '') {
        if (x instanceof Date) x = Utilities.formatDate(x, 'America/Bogota', k === 'welliDesde' ? 'yyyy-MM' : 'yyyy-MM-dd');
        x = "'" + String(x);
      }
      return [k, x];
    });
    sh.getRange(2, 1, filas.length, 2).setValues(filas);
    sh.getRange(1, 4).setValue('Actualizado: ' + new Date().toLocaleString('es-CO'));
    SpreadsheetApp.flush();
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

function pull() {
  var sh = hojaMov();
  var last = sh.getLastRow();
  var movs = [];
  if (last > 1) {
    var v = sh.getRange(2, 1, last - 1, COLS.length).getValues();
    for (var i = 0; i < v.length; i++) {
      movs.push({
        id: String(v[i][0]), f: String(v[i][1]), ts: String(v[i][2]),
        cat: String(v[i][3]), nota: String(v[i][5]), src: String(v[i][6]),
        nec: String(v[i][7]), tipo: String(v[i][8]), val: Number(v[i][9]) || 0
      });
    }
  }
  var est = {};
  var se = hojaEst(), le = se.getLastRow();
  if (le > 1) {
    var ve = se.getRange(2, 1, le - 1, 2).getValues();
    for (var j = 0; j < ve.length; j++) est[String(ve[j][0])] = ve[j][1];
  }
  return { ok: true, movs: movs, estado: est };
}

/* ---------- utilidades manuales (se corren desde el editor) ---------- */

/** Ejecútalo una vez desde el editor para crear las hojas antes de desplegar. */
function inicializar() {
  hojaMov();
  hojaEst();
  estado({ B1: 439769, B2: 310909, B3: 3560158, tcSaldo: 823837, deudaPagadas: 0, fondo: 0, lastQ: '' });
  Logger.log('Hojas creadas y estado inicial cargado.');
}

/** Limpia ya las claves repetidas de Estado sin tocar ningún valor. */
function limpiarEstado() {
  estado({});
  Logger.log('Estado reescrito sin duplicados.');
}

/** Genera un token aleatorio y lo guarda como propiedad TOKEN. Lo verás en el registro. */
function crearToken() {
  var t = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 8);
  PropertiesService.getScriptProperties().setProperty('TOKEN', t);
  Logger.log('TOKEN creado. Cópialo en la app (Ajustes → Token): ' + t);
}
