/**
 * Backend de cercanIA (Google Apps Script).
 * Instrucciones de instalación en el README.md del repositorio.
 *
 * API (todas las respuestas son JSON):
 *   GET                              -> { ok, currentPhase, data: [{ clientId, name, avatar, phase, value, updatedAt }] }
 *   POST { action: 'save', clientId, name, avatar, value }   -> { ok, phase }
 *   POST { action: 'delete', clientId, name }                -> { ok }  (solo en Fase 1)
 *   POST { action: 'set_phase', phase, adminKey }            -> { ok, phase }
 */

const SHEET_NAME = 'Respuestas';
const HEADERS = ['updatedAt', 'clientId', 'name', 'avatar', 'phase', 'value'];
const MAX_NAME_LENGTH = 60;

function doGet() {
  return json({ ok: true, currentPhase: getPhase(), data: readRows() });
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json({ ok: false, error: 'invalid_json' });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    switch (body.action) {
      case 'save': return json(saveAnswer(body));
      case 'delete': return json(deleteStudent(body));
      case 'set_phase': return json(setPhase(body));
      default: return json({ ok: false, error: 'unknown_action' });
    }
  } finally {
    lock.releaseLock();
  }
}

function saveAnswer(body) {
  const clientId = cleanText(body.clientId, 64);
  const name = cleanText(body.name, MAX_NAME_LENGTH);
  const avatar = cleanText(body.avatar, 16);
  const value = Number(body.value);
  if (!clientId || !name) return { ok: false, error: 'missing_fields' };
  if (!Number.isFinite(value) || value < 0 || value > 100) return { ok: false, error: 'invalid_value' };

  const phase = getPhase();
  const sheet = getSheet();
  const rowValues = [new Date(), clientId, name, avatar, phase, Math.round(value)];

  // Una fila por participante y fase: si ya existe, se sobrescribe.
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][1]) === clientId && Number(values[i][4]) === phase) {
      sheet.getRange(i + 1, 1, 1, HEADERS.length).setValues([rowValues]);
      return { ok: true, phase: phase };
    }
  }
  sheet.appendRow(rowValues);
  return { ok: true, phase: phase };
}

function deleteStudent(body) {
  if (getPhase() !== 1) return { ok: false, error: 'phase_locked', phase: getPhase() };
  const clientId = cleanText(body.clientId, 64);
  if (!clientId) return { ok: false, error: 'missing_fields' };

  const sheet = getSheet();
  const values = sheet.getDataRange().getValues();
  // De abajo hacia arriba para que los índices no se desplacen al borrar.
  for (let i = values.length - 1; i >= 1; i--) {
    if (String(values[i][1]) === clientId) sheet.deleteRow(i + 1);
  }
  return { ok: true };
}

function setPhase(body) {
  const adminKey = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY');
  if (!adminKey) return { ok: false, error: 'admin_key_not_configured' };
  if (String(body.adminKey || '') !== adminKey) return { ok: false, error: 'unauthorized' };

  const phase = Number(body.phase);
  if (phase !== 1 && phase !== 2) return { ok: false, error: 'invalid_phase' };
  PropertiesService.getScriptProperties().setProperty('CURRENT_PHASE', String(phase));
  return { ok: true, phase: phase };
}

// --- Utilidades ---

function getPhase() {
  const phase = Number(PropertiesService.getScriptProperties().getProperty('CURRENT_PHASE'));
  return phase === 2 ? 2 : 1;
}

function getSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function readRows() {
  const values = getSheet().getDataRange().getValues();
  return values.slice(1).map(function (row) {
    return {
      updatedAt: row[0] instanceof Date ? row[0].toISOString() : String(row[0]),
      clientId: String(row[1]),
      name: String(row[2]),
      avatar: String(row[3]),
      phase: Number(row[4]),
      value: Number(row[5])
    };
  });
}

function cleanText(value, maxLength) {
  return String(value == null ? '' : value).trim().slice(0, maxLength);
}

function json(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
