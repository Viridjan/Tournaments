// ══════════════════════════════════════════════════════════════
// Tournament Manager — Google Apps Script Backend
// ══════════════════════════════════════════════════════════════
//
// SETUP:
// 1. Create a new Google Sheet
// 2. Create 3 tabs (sheets): "ELO", "Seeds", "Rules"
// 3. In the ELO tab, add headers in row 1: Name | ELO | Test
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
// ══════════════════════════════════════════════════════════════

function doGet(e) {
  var action = e.parameter.action || "load";

  if (action === "load") return loadElo();
  if (action === "seed_load") return loadSeed(e.parameter.id);
  if (action === "seed_list") return listSeeds();
  if (action === "rules") return loadRules(e.parameter.tournament);

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

function loadElo() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("ELO");
  if (!sheet) return jsonResponse({ entries: [] });

  var data = sheet.getDataRange().getValues();
  var entries = [];

  for (var i = 1; i < data.length; i++) {
    var name = String(data[i][0] || "").trim();
    if (!name) continue;
    entries.push({
      name: name,
      elo: parseInt(data[i][1]) || 1000,
      test: data[i][2] === true || String(data[i][2]).toLowerCase() === "true"
    });
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

  var existing = sheet.getDataRange().getValues();
  var rowMap = {};
  for (var i = 1; i < existing.length; i++) {
    var name = String(existing[i][0] || "").trim().toLowerCase();
    if (name) rowMap[name] = i + 1;
  }

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

  // Support both new format (data as string) and old format (chunks array)
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
        // Try parsing as direct JSON snapshot (v3)
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Old format: chunks array
          return jsonResponse({ ok: true, chunks: parsed });
        } else {
          // New format: direct data or snapshot object
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

  // Delete from bottom up to avoid row index shifting
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

// ── Helpers ──

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
