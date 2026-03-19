/**
 * Control Financiero — Bolsillos
 * Google Apps Script — Backend para la app de control de gastos
 *
 * Instrucciones:
 * 1. Reemplaza TU_SHEET_ID con el ID de tu Google Sheet
 * 2. Implementa como Web App con acceso "Cualquier usuario"
 * 3. Copia la URL y pégala en index.html
 */

const SHEET_ID = 'TU_SHEET_ID';
const SHEET_NAME = 'Movimientos';
const SALDO_INICIAL_B1 = 1321578;
const SALDO_INICIAL_B2 = 902700;

function doGet(e) {
  const callback = e.parameter.callback || 'callback';
  const action = e.parameter.action || 'read';
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);
  let result;

  try {
    if (action === 'append') {
      const values = JSON.parse(decodeURIComponent(e.parameter.values));

      // Buscar saldos anteriores desde la última fila con datos
      const lastRow = sheet.getLastRow();
      let prevB1 = SALDO_INICIAL_B1;
      let prevB2 = SALDO_INICIAL_B2;

      for (let r = lastRow; r >= 3; r--) {
        const h = sheet.getRange(r, 8).getValue();
        const i = sheet.getRange(r, 9).getValue();
        if (h !== '' && !isNaN(h) && h !== 0) prevB1 = parseFloat(h);
        if (i !== '' && !isNaN(i) && i !== 0) prevB2 = parseFloat(i);
        if (h !== '' && i !== '') break;
      }

      // Calcular nuevos saldos
      const bol   = values[3];
      const tipo  = values[4];
      const medio = values[5];
      const valor = parseFloat(values[6]) || 0;

      let newB1 = prevB1;
      let newB2 = prevB2;

      // Tarjeta de crédito en modo Gasto no mueve saldo (se mueve al pagar)
      const esTCGasto = (medio === 'Tarjeta crédito' && tipo === 'Gasto');

      if (!esTCGasto) {
        if (tipo === 'Gasto' || tipo === 'Pago TC') {
          if (bol === 'Bolsillo 1') newB1 = prevB1 - valor;
          else if (bol === 'Bolsillo 2') newB2 = prevB2 - valor;
        } else if (tipo === 'Ingreso') {
          if (bol === 'Bolsillo 1') newB1 = prevB1 + valor;
          else if (bol === 'Bolsillo 2') newB2 = prevB2 + valor;
          // Bolsillo 3 no se refleja en H/I (es ahorro)
        }
      }

      // Escribir fila con saldos calculados
      values[7] = newB1;
      values[8] = newB2;

      sheet.appendRow(values);
      result = { ok: true, b1: newB1, b2: newB2 };

    } else {
      // Leer todos los datos
      const data = sheet.getDataRange().getValues();
      result = { ok: true, values: data };
    }

  } catch (err) {
    result = { ok: false, error: err.message };
  }

  return ContentService
    .createTextOutput(callback + '(' + JSON.stringify(result) + ')')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
