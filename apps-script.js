// ══════════════════════════════════════════════════════════════
// Tournament Manager — Google Apps Script Backend
// ══════════════════════════════════════════════════════════════
//
// SETUP:
// 1. Create a new Google Sheet
// 2. Create tabs (sheets): "ELO", "Seeds", "Rules"
// 3. In the ELO tab, add headers in row 1: Test | Name | ELO Magic | ELO Risk (etc.)
//    (ELO column names must match the eloDB setting in each tournament's config)
// 4. In the Seeds tab, add headers in row 1: ID | Label | Timestamp | Data
// 5. In the Rules tab, add headers in row 1: Tournament | Category | Rule | Description | Update
//    Then add your rules with the tournament name matching exactly
//    (e.g., "Drunken Draft", "Vintage Draft", "Risk Grand Prix")
// 6. Go to Extensions > Apps Script
// 7. Paste this entire script, replacing any existing code
// 8. Click Deploy > New deployment
// 9. Type: Web app
// 10. Execute as: Me
// 11. Who has access: Anyone
// 12. Click Deploy and copy the URL
// 13. Paste the URL into the Tournament Manager's Database URL field
//
// Tournament config and global settings are managed in config/ files in the repo,
// not in the Sheet. Only ELO data, seeds, and rules live here.
//
// ══════════════════════════════════════════════════════════════

function doGet(e) {
  var action = e.parameter.action || "load";

  if (action === "load") return loadElo(e.parameter.col);
  if (action === "seed_load") return loadSeed(e.parameter.id);
  if (action === "seed_list") return listSeeds();
  if (action === "rules") return loadRules(e.parameter.tournament);
  if (action === "debug_elo") return debugElo();
  if (action === "elo_cols") return eloColumns();

  return jsonResponse({ error: "Unknown action" });
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action || "save";

    if (action === "save") return saveElo(data);
    if (action === "seed_save") return saveSeed(data);
    if (action === "seed_delete") return deleteSeed(data);

    return jsonResponse({ error: "Unknown action" });
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

// ── ELO Database ──

function loadElo(colName) {
  var col = colName || "ELO";
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("ELO");
  if (!sheet) return jsonResponse({ entries: [] });

  var data = sheet.getDataRange().getValues();
  if (data.length < 1) return jsonResponse({ entries: [] });

  var headers = data[0].map(function(h) { return String(h).trim().toLowerCase(); });
  var nameIdx = headers.indexOf("name");
  var eloIdx = headers.indexOf(col.toLowerCase());
  var testIdx = headers.indexOf("test");

  if (nameIdx === -1 || eloIdx === -1) return jsonResponse({ entries: [] });

  var seen = {};
  for (var i = 1; i < data.length; i++) {
    var pName = String(data[i][nameIdx] || "").trim();
    if (!pName) continue;
    var eloVal = parseInt(data[i][eloIdx]);
    if (isNaN(eloVal)) continue; // no valid ELO in this column — client default applies
    var key = pName.toLowerCase();
    seen[key] = {
      name: pName,
      elo: eloVal,
      test: testIdx !== -1 && (data[i][testIdx] === true || String(data[i][testIdx]).toLowerCase() === "true")
    };
  }

  var entries = [];
  for (var k in seen) entries.push(seen[k]);
  return jsonResponse({ entries: entries });
}

function saveElo(data) {
  var colName = data.col || "ELO";
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName("ELO");
  if (!sheet) {
    sheet = spreadsheet.insertSheet("ELO");
    sheet.getRange(1, 1, 1, 3).setValues([["Test", "Name", colName]]);
  }

  var entries = data.entries || [];
  if (!entries.length) return jsonResponse({ ok: true, count: 0 });

  var allData = sheet.getDataRange().getValues();
  var headers = allData[0].map(function(h) { return String(h).trim(); });
  var headersLower = headers.map(function(h) { return h.toLowerCase(); });

  // Case-insensitive lookups — loadElo does the same; saveElo must match.
  var nameIdx = headersLower.indexOf("name");
  var eloIdx  = headersLower.indexOf(colName.toLowerCase());
  var testIdx = headersLower.indexOf("test");

  // Add missing columns at the end (never overwrite existing headers).
  if (nameIdx === -1) {
    nameIdx = headers.length;
    sheet.getRange(1, nameIdx + 1).setValue("Name");
    headers.push("Name"); headersLower.push("name");
  }
  if (eloIdx === -1) {
    eloIdx = headers.length;
    sheet.getRange(1, eloIdx + 1).setValue(colName);
    headers.push(colName); headersLower.push(colName.toLowerCase());
  }
  if (testIdx === -1) {
    testIdx = headers.length;
    sheet.getRange(1, testIdx + 1).setValue("Test");
    headers.push("Test"); headersLower.push("test");
  }

  // Re-read after any column additions
  allData = sheet.getDataRange().getValues();
  headers = allData[0].map(function(h) { return String(h).trim(); });
  headersLower = headers.map(function(h) { return h.toLowerCase(); });
  nameIdx = headersLower.indexOf("name");
  eloIdx  = headersLower.indexOf(colName.toLowerCase());
  testIdx = headersLower.indexOf("test");

  // Build name→row map
  var rowMap = {};
  for (var i = 1; i < allData.length; i++) {
    var n = String(allData[i][nameIdx] || "").trim().toLowerCase();
    if (n) rowMap[n] = i + 1;
  }

  // Update existing row or append new one
  for (var j = 0; j < entries.length; j++) {
    var e = entries[j];
    var key = e.name.toLowerCase();
    var testVal = e.test === true || e.test === "true";

    if (rowMap[key]) {
      sheet.getRange(rowMap[key], eloIdx + 1).setValue(e.elo);
      sheet.getRange(rowMap[key], testIdx + 1).setValue(testVal);
    } else {
      // New player: seed 1000 in every ELO column, then overwrite this column.
      var newRow = new Array(headers.length).fill("");
      newRow[nameIdx] = e.name;
      newRow[testIdx] = testVal;
      for (var h = 0; h < headers.length; h++) {
        var hl = headersLower[h];
        if (h !== nameIdx && h !== testIdx && hl !== "" && hl !== "name" && hl !== "test") {
          newRow[h] = ""; // other ELO columns left blank — client uses cfg.eloDefault
        }
      }
      newRow[eloIdx] = e.elo;
      sheet.appendRow(newRow);
      rowMap[key] = sheet.getLastRow();
    }
  }

  return jsonResponse({ ok: true, count: entries.length });
}

// ── Seeds ──

function saveSeed(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Seeds");
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet("Seeds");
    sheet.getRange(1, 1, 1, 4).setValues([["ID", "Label", "Timestamp", "Data"]]);
  }

  var id = data.id || "";
  var label = data.label || "";
  var timestamp = new Date().toISOString();
  var stored = data.data || JSON.stringify(data.chunks || []);

  sheet.appendRow([id, label, timestamp, stored]);

  return jsonResponse({ ok: true, id: id });
}

function loadSeed(id) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Seeds");
  if (!sheet) return jsonResponse({ ok: false, error: "No Seeds sheet" });

  id = (id || "").toUpperCase();
  var data = sheet.getDataRange().getValues();

  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]).toUpperCase() === id) {
      var raw = String(data[i][3]);
      try {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return jsonResponse({ ok: true, chunks: parsed });
        } else {
          return jsonResponse({ ok: true, data: raw });
        }
      } catch (e) {
        return jsonResponse({ ok: false, error: "Corrupt seed data" });
      }
    }
  }

  return jsonResponse({ ok: false, error: "Seed not found: " + id });
}

function deleteSeed(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Seeds");
  if (!sheet) return jsonResponse({ ok: false, error: "No Seeds sheet" });

  var id = (data.id || "").toUpperCase();
  var rows = sheet.getDataRange().getValues();

  for (var i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][0]).toUpperCase() === id) {
      sheet.deleteRow(i + 1);
    }
  }

  return jsonResponse({ ok: true, id: id });
}

function listSeeds() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Seeds");
  if (!sheet) return jsonResponse({ seeds: [] });

  var data = sheet.getDataRange().getValues();
  var seeds = [];

  for (var i = 1; i < data.length; i++) {
    seeds.push({
      id: String(data[i][0]),
      label: String(data[i][1]),
      timestamp: String(data[i][2])
    });
  }

  return jsonResponse({ seeds: seeds });
}

// ── Rules ──

function loadRules(tournament) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Rules");
  if (!sheet) return jsonResponse({ rows: [] });

  tournament = (tournament || "").toLowerCase();
  var data = sheet.getDataRange().getValues();
  var rows = [];

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase() === tournament) {
      rows.push(data[i].slice(1).filter(function(c) { return c !== ""; }));
    }
  }

  return jsonResponse({ rows: rows });
}

// ── Debug ──

function eloColumns() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("ELO");
  if (!sheet) return jsonResponse({ cols: [] });
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var cols = headers.map(function(h) { return String(h).trim(); }).filter(function(h) {
    return h && h.toLowerCase() !== "test" && h.toLowerCase() !== "name";
  });
  return jsonResponse({ cols: cols });
}

function debugElo() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("ELO");
  if (!sheet) return jsonResponse({ error: "No sheet named ELO" });
  var data = sheet.getDataRange().getValues();
  return jsonResponse({
    rowCount: data.length,
    headers: data.length > 0 ? data[0] : [],
    firstDataRow: data.length > 1 ? data[1] : []
  });
}

// ── Helpers ──

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
