/**
 * Backend de cercanIA (Google Apps Script).
 * Instrucciones de instalación en el README.md del repositorio.
 *
 * API (todas las respuestas son JSON):
 *   GET   -> { ok, currentPhase, showResults, resultsView, averages? }   (público: sin nombres)
 *   POST { action: 'find', code }                                 -> { ok, found, name, avatar, values }
 *   POST { action: 'save', code, name, avatar, value }            -> { ok, phase }
 *   POST { action: 'delete', code }                               -> { ok }  (solo en la Fase 1)
 *   POST { action: 'list', adminKey }                             -> { ok, currentPhase, showResults, resultsView, data }
 *   POST { action: 'set_phase', phase, adminKey }                 -> { ok, phase }
 *   POST { action: 'set_results', show, view, adminKey }          -> { ok, showResults, resultsView }
 */

const SHEET_NAME = 'Respuestas';
const HEADERS = ['updatedAt', 'code', 'name', 'avatar', 'phase', 'value'];
const TOTAL_PHASES = [1, 2, 3, 4]; // Las preguntas de cada fase están en index.html
const DELETE_PHASES = [1]; // Solo al empezar el participante puede volver a registrarse
const MAX_NAME_LENGTH = 60;

function doGet() {
  const response = { ok: true, currentPhase: getPhase(), showResults: getShowResults(), resultsView: getResultsView() };
  // Los promedios son públicos solo cuando el profesor los habilita, y nunca incluyen nombres
  if (response.showResults) response.averages = averagesByPhase();
  return json(response);
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
      case 'find': return json(findParticipant(body));
      case 'list': return json(listAnswers(body));
      case 'save': return json(saveAnswer(body));
      case 'delete': return json(deleteStudent(body));
      case 'set_phase': return json(setPhase(body));
      case 'set_results': return json(setResults(body));
      default: return json({ ok: false, error: 'unknown_action' });
    }
  } finally {
    lock.releaseLock();
  }
}

// Permite volver a entrar otro día u otro dispositivo con el código personal
function findParticipant(body) {
  const code = cleanCode(body.code);
  if (!code) return { ok: false, error: 'missing_fields' };

  const rows = readRows().filter(function (row) { return row.code === code; });
  if (!rows.length) return { ok: true, found: false };

  const values = {};
  rows.forEach(function (row) { values[row.phase] = row.value; });
  return { ok: true, found: true, name: rows[0].name, avatar: rows[0].avatar, values: values };
}

function saveAnswer(body) {
  const code = cleanCode(body.code);
  const name = cleanText(body.name, MAX_NAME_LENGTH);
  const avatar = cleanText(body.avatar, 16);
  const value = Number(body.value);
  if (!code || !name) return { ok: false, error: 'missing_fields' };
  if (!Number.isFinite(value) || value < 0 || value > 100) return { ok: false, error: 'invalid_value' };

  const phase = getPhase();
  const sheet = getSheet();
  const rowValues = [new Date(), code, name, avatar, phase, Math.round(value)];
  const values = sheet.getDataRange().getValues();

  // El código ya es de otra persona: quien llama debe generar uno nuevo
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][1]) === code && String(values[i][2]) !== name) {
      return { ok: false, error: 'code_taken' };
    }
  }

  // Una fila por participante y fase: si ya existe, se sobrescribe.
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][1]) === code && Number(values[i][4]) === phase) {
      sheet.getRange(i + 1, 1, 1, HEADERS.length).setValues([rowValues]);
      return { ok: true, phase: phase };
    }
  }
  sheet.appendRow(rowValues);
  return { ok: true, phase: phase };
}

function deleteStudent(body) {
  if (!DELETE_PHASES.includes(getPhase())) return { ok: false, error: 'phase_locked', phase: getPhase() };
  const code = cleanCode(body.code);
  if (!code) return { ok: false, error: 'missing_fields' };

  const sheet = getSheet();
  const values = sheet.getDataRange().getValues();
  // De abajo hacia arriba para que los índices no se desplacen al borrar.
  for (let i = values.length - 1; i >= 1; i--) {
    if (String(values[i][1]) === code) sheet.deleteRow(i + 1);
  }
  return { ok: true };
}

function listAnswers(body) {
  const authError = checkAdminKey(body);
  if (authError) return authError;
  return {
    ok: true,
    currentPhase: getPhase(),
    showResults: getShowResults(),
    resultsView: getResultsView(),
    data: readRows()
  };
}

function setPhase(body) {
  const authError = checkAdminKey(body);
  if (authError) return authError;

  const phase = Number(body.phase);
  if (!TOTAL_PHASES.includes(phase)) return { ok: false, error: 'invalid_phase' };
  PropertiesService.getScriptProperties().setProperty('CURRENT_PHASE', String(phase));
  return { ok: true, phase: phase };
}

function setResults(body) {
  const authError = checkAdminKey(body);
  if (authError) return authError;

  const properties = PropertiesService.getScriptProperties();
  properties.setProperty('SHOW_RESULTS', body.show ? 'yes' : 'no');
  properties.setProperty('RESULTS_VIEW', cleanText(body.view, 20));
  return { ok: true, showResults: getShowResults(), resultsView: getResultsView() };
}

// --- Utilidades ---

function checkAdminKey(body) {
  const adminKey = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY');
  if (!adminKey) return { ok: false, error: 'admin_key_not_configured' };
  if (String(body.adminKey || '') !== adminKey) return { ok: false, error: 'unauthorized' };
  return null;
}

function getPhase() {
  const phase = Number(PropertiesService.getScriptProperties().getProperty('CURRENT_PHASE'));
  return TOTAL_PHASES.includes(phase) ? phase : 1;
}

function getShowResults() {
  return PropertiesService.getScriptProperties().getProperty('SHOW_RESULTS') === 'yes';
}

function getResultsView() {
  return PropertiesService.getScriptProperties().getProperty('RESULTS_VIEW') || '';
}

// Promedio de cada fase, solo entre quienes respondieron esa pregunta
function averagesByPhase() {
  const totals = {};
  readRows().forEach(function (row) {
    if (!Number.isFinite(row.value)) return;
    if (!totals[row.phase]) totals[row.phase] = { sum: 0, count: 0 };
    totals[row.phase].sum += row.value;
    totals[row.phase].count++;
  });

  const averages = {};
  Object.keys(totals).forEach(function (phase) {
    averages[phase] = totals[phase].sum / totals[phase].count;
  });
  return averages;
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
      code: String(row[1]),
      name: String(row[2]),
      avatar: String(row[3]),
      phase: Number(row[4]),
      value: Number(row[5])
    };
  });
}

function cleanCode(value) {
  return cleanText(value, 16).toUpperCase();
}

function cleanText(value, maxLength) {
  return String(value == null ? '' : value).trim().slice(0, maxLength);
}

function json(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
