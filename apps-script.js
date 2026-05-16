// ══════════════════════════════════════════════════════════════
// Tournament Manager — Google Apps Script Backend
// ══════════════════════════════════════════════════════════════
//
// SETUP:
// 1. Create a new Google Sheet
// 2. Create 4 tabs (sheets): "ELO", "Seeds", "Rules", "Settings"
// 3. In the ELO tab, add headers in row 1: Name | ELO | Test
// 4. In the Seeds tab, add headers in row 1: ID | Label | Timestamp | Data
// 5. In the Rules tab, add headers in row 1: Tournament | Category | Rule | Description | Update
//    Then add your rules with the tournament name matching exactly
//    (e.g., "Drunken Draft", "Vintage Draft", "Risk Grand Prix")
// 6. In the Settings tab, add headers in row 1:
//    id | name | icon | desc | scoring | startScore | winPoints | drawPoints | lossPoints |
//    cumulativeDrawPenalty | pairing | rrRounds | timerMinutes | draft | elo | eloKMax |
//    firstPlayer | grandPrix | gpBestOfLast | gpDropWorst | prizes | timeout | timeoutTime |
//    spinner | rules | matchMin | matchMax
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

  if (action === "load") return loadElo();
  if (action === "seed_load") return loadSeed(e.parameter.id);
  if (action === "seed_list") return listSeeds();
  if (action === "rules") return loadRules(e.parameter.tournament);
  if (action === "tournament_list") return loadTournaments();

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

function loadElo() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("ELO");
  if (!sheet) return jsonResponse({ entries: [] });

  var data = sheet.getDataRange().getValues();
  // Deduplicate by lowercase name — last row wins
  var seen = {};
  for (var i = 1; i < data.length; i++) {
    var name = String(data[i][0] || "").trim();
    if (!name) continue;
    var key = name.toLowerCase();
    seen[key] = {
      name: name,
      elo: parseInt(data[i][1]) || 1000,
      test: data[i][2] === true || String(data[i][2]).toLowerCase() === "true"
    };
  }

  var entries = [];
  for (var k in seen) {
    entries.push(seen[k]);
  }

  return jsonResponse({ entries: entries });
}

function saveElo(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("ELO");
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet("ELO");
    sheet.getRange(1, 1, 1, 3).setValues([["Name", "ELO", "Test"]]);
  }

  var entries = data.entries || [];
  if (!entries.length) return jsonResponse({ ok: true, count: 0 });

  // First: remove all duplicate rows (keep first occurrence of each name)
  var existing = sheet.getDataRange().getValues();
  var seenNames = {};
  var rowsToDelete = [];
  for (var i = 1; i < existing.length; i++) {
    var name = String(existing[i][0] || "").trim().toLowerCase();
    if (!name) continue;
    if (seenNames[name]) {
      rowsToDelete.push(i + 1); // 1-indexed row
    } else {
      seenNames[name] = i + 1;
    }
  }
  // Delete from bottom up to avoid index shifting
  for (var d = rowsToDelete.length - 1; d >= 0; d--) {
    sheet.deleteRow(rowsToDelete[d]);
  }

  // Re-read after cleanup
  existing = sheet.getDataRange().getValues();
  var rowMap = {};
  for (var i = 1; i < existing.length; i++) {
    var name = String(existing[i][0] || "").trim().toLowerCase();
    if (name) rowMap[name] = i + 1;
  }

  // Update existing or append new
  for (var j = 0; j < entries.length; j++) {
    var e = entries[j];
    var key = e.name.toLowerCase();
    var testVal = e.test === true || e.test === "true";

    if (rowMap[key]) {
      sheet.getRange(rowMap[key], 1, 1, 3).setValues([[e.name, e.elo, testVal]]);
    } else {
      sheet.appendRow([e.name, e.elo, testVal]);
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
  "scoring", "startScore", "winPoints", "drawPoints", "lossPoints",
  "cumulativeDrawPenalty", "pairing", "rrRounds", "timerMinutes", "draft", "elo", "eloKMax",
  "firstPlayer", "grandPrix", "gpBestOfLast", "gpDropWorst", "prizes", "timeout",
  "timeoutTime", "spinner", "rules", "matchMin", "matchMax"
];

function loadTournaments() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Settings");
  if (!sheet) return jsonResponse({ tournaments: [] });

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return jsonResponse({ tournaments: [] });

  var headers = data[0].map(function(h) { return String(h).trim(); });
  var tournaments = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var idIdx = headers.indexOf("id");
    var id = idIdx !== -1 ? String(row[idIdx] || "").trim() : "";
    if (!id) continue;

    var t = {
      id: id,
      name: String(row[headers.indexOf("name")] || ""),
      icon: String(row[headers.indexOf("icon")] || ""),
      desc: String(row[headers.indexOf("desc")] || ""),
      features: {}
    };

    TOURNAMENT_FEATURE_KEYS.forEach(function(key) {
      var idx = headers.indexOf(key);
      if (idx === -1) return;
      t.features[key] = row[idx];
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

// ── Helpers ──

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
