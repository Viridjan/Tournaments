// ══════════════════════════════════════════════════════════════
// Tournament Manager — Google Apps Script Backend
// ══════════════════════════════════════════════════════════════
//
// SETUP:
// 1. Create a new Google Sheet
// 2. Create tabs (sheets): "ELO", "Seeds", "Rules", "Settings"
// 3. In the ELO tab, add headers in row 1: Test | ELO Magic | ELO Risk | Name
//    (ELO column names must match the eloCol setting in each tournament's Settings row)
// 4. In the Seeds tab, add headers in row 1: ID | Label | Timestamp | Data
// 5. In the Rules tab, add headers in row 1: Tournament | Category | Rule | Description | Update
//    Then add your rules with the tournament name matching exactly
//    (e.g., "Drunken Draft", "Vintage Draft", "Risk Grand Prix")
// 6. In the Settings tab, add headers in row 1:
//    id | name | icon | desc | scoring | startScore | pts1 | pts2 | pts3 | ptsLast |
//    winPoints | drawPoints | lossPoints | cumulativeDrawPenalty | rrRounds |
//    timerMinutes | draft | elo | eloKMax | eloScale | eloDB | firstPlayer | grandPrix |
//    prizes | timeout | timeoutTime | spinner | rules | matchRound | matchMax
//    Then add one row per tournament type.
// 7. Go to Extensions > Apps Script
// 8. Paste this entire script, replacing any existing code
// 9. Click Deploy > New deployment
// 10. Type: Web app
// 11. Execute as: Me
// 12. Who has access: Anyone
// 13. Click Deploy and copy the URL
// 14. Paste the URL into the Tournament Manager's Database URL field
//
// ══════════════════════════════════════════════════════════════

function doGet(e) {
  var action = e.parameter.action || "load";

  if (action === "load") return loadElo(e.parameter.col);
  if (action === "seed_load") return loadSeed(e.parameter.id);
  if (action === "seed_list") return listSeeds();
  if (action === "rules") return loadRules(e.parameter.tournament);
  if (action === "tournament_list") return loadTournaments();
  if (action === "debug_settings") return debugSettings();
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
    if (action === "tournament_save") return saveTournament(data);

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
    var key = pName.toLowerCase();
    seen[key] = {
      name: pName,
      elo: parseInt(data[i][eloIdx]) || 1000,
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
    sheet.getRange(1, 1, 1, 3).setValues([["Test", colName, "Name"]]);
  }

  var entries = data.entries || [];
  if (!entries.length) return jsonResponse({ ok: true, count: 0 });

  var allData = sheet.getDataRange().getValues();
  var headers = allData[0].map(function(h) { return String(h).trim(); });

  var nameIdx = headers.indexOf("Name");
  var eloIdx = headers.indexOf(colName);
  var testIdx = headers.indexOf("Test");

  // Add Name column if sheet is empty/malformed
  if (nameIdx === -1) {
    sheet.getRange(1, 1).setValue("Name");
    nameIdx = 0;
  }
  // Add this ELO column if missing
  if (eloIdx === -1) {
    var insertAt = testIdx !== -1 ? testIdx : headers.length;
    // Shift Test column right if it exists
    if (testIdx !== -1) {
      sheet.insertColumnBefore(testIdx + 1);
      sheet.getRange(1, testIdx + 1).setValue(colName);
      eloIdx = testIdx;
      testIdx = testIdx + 1;
    } else {
      sheet.getRange(1, headers.length + 1).setValue(colName);
      eloIdx = headers.length;
    }
  }
  // Add Test column if missing
  if (testIdx === -1) {
    allData = sheet.getDataRange().getValues();
    headers = allData[0].map(function(h) { return String(h).trim(); });
    testIdx = headers.length;
    sheet.getRange(1, testIdx + 1).setValue("Test");
  }

  // Re-read after any column additions
  allData = sheet.getDataRange().getValues();
  headers = allData[0].map(function(h) { return String(h).trim(); });
  nameIdx = headers.indexOf("Name");
  eloIdx = headers.indexOf(colName);
  testIdx = headers.indexOf("Test");

  // Build name→row map
  var rowMap = {};
  for (var i = 1; i < allData.length; i++) {
    var n = String(allData[i][nameIdx] || "").trim().toLowerCase();
    if (n) rowMap[n] = i + 1;
  }

  // Update or append
  for (var j = 0; j < entries.length; j++) {
    var e = entries[j];
    var key = e.name.toLowerCase();
    var testVal = e.test === true || e.test === "true";

    if (rowMap[key]) {
      sheet.getRange(rowMap[key], eloIdx + 1).setValue(e.elo);
      sheet.getRange(rowMap[key], testIdx + 1).setValue(testVal);
    } else {
      // New player: fill row with 1000 for all ELO columns, then set this one
      var newRow = new Array(headers.length).fill("");
      newRow[nameIdx] = e.name;
      newRow[testIdx] = testVal;
      for (var h = 0; h < headers.length; h++) {
        if (h !== nameIdx && h !== testIdx && headers[h] !== "") newRow[h] = 1000;
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

// ── Tournaments ──

var TOURNAMENT_FEATURE_KEYS = [
  "scoring", "startScore", "pts1", "pts2", "pts3", "ptsLast", "winPoints", "drawPoints", "lossPoints",
  "cumulativeDrawPenalty", "rrRounds", "timerMinutes", "draft", "elo", "eloKMax",
  "eloScale", "eloDB", "firstPlayer", "grandPrix", "prizes",
  "timeout", "timeoutTime", "spinner", "rules", "matchRound", "matchMax",
  "gpBestOfLast", "gpDropWorst"
];

function loadTournaments() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Settings");
  if (!sheet) return jsonResponse({ tournaments: [] });

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return jsonResponse({ tournaments: [] });

  var headers = data[0].map(function(h) { return String(h).trim().toLowerCase(); });
  var tournaments = [];

  function hIdx(key) { return headers.indexOf(key.toLowerCase()); }

  var idColIdx = hIdx("id") !== -1 ? hIdx("id") : 0;

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var id = String(row[idColIdx] || "").trim();
    if (!id) continue;

    var t = {
      id: id,
      name: String(row[hIdx("name")] !== undefined ? row[hIdx("name")] : ""),
      icon: String(row[hIdx("icon")] !== undefined ? row[hIdx("icon")] : ""),
      desc: String(row[hIdx("desc")] !== undefined ? row[hIdx("desc")] : ""),
      features: {}
    };

    TOURNAMENT_FEATURE_KEYS.forEach(function(key) {
      var idx = hIdx(key);
      if (idx === -1) return;
      var val = row[idx];
      if (val instanceof Date) {
        var hh = val.getHours(), mm = val.getMinutes();
        val = (hh < 10 ? "0" : "") + hh + ":" + (mm < 10 ? "0" : "") + mm;
      }
      t.features[key] = val;
    });

    tournaments.push(t);
  }

  return jsonResponse({ tournaments: tournaments });
}

function saveTournament(data) {
  var t = data.tournament;
  if (!t || !t.id) return jsonResponse({ error: "Missing tournament id" });

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Settings");
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet("Settings");
    var initHeaders = ["id", "name", "icon", "desc"].concat(TOURNAMENT_FEATURE_KEYS);
    sheet.getRange(1, 1, 1, initHeaders.length).setValues([initHeaders]);
  }

  var existing = sheet.getDataRange().getValues();
  var headers = existing[0].map(function(h) { return String(h).trim(); });

  var row = headers.map(function(h) {
    if (h === "id") return t.id;
    if (h === "name") return t.name || "";
    if (h === "icon") return t.icon || "";
    if (h === "desc") return t.desc || "";
    return t.features && t.features[h] !== undefined ? t.features[h] : "";
  });

  var idIdx = headers.indexOf("id");
  for (var i = 1; i < existing.length; i++) {
    if (String(existing[i][idIdx]).trim() === t.id) {
      sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
      return jsonResponse({ ok: true, id: t.id });
    }
  }

  sheet.appendRow(row);
  return jsonResponse({ ok: true, id: t.id });
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

function debugSettings() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Settings");
  if (!sheet) return jsonResponse({ error: "No sheet named Settings" });
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
