// ═══════════════════════════════════════════════════════
// Global constants — loaded before all other scripts

// ELO system defaults
const ELO_DEFAULT = 1000, // starting ELO for new players
  ELO_K_MAX = 50,         // max K-factor (ELO sensitivity per match)
  ELO_SCALE = 500,        // ELO scale (controls rating spread; higher = flatter curve)

// localStorage keys
  LS_ELO_DB = "tournament_elo_db_v2",       // ELO database (keyed by sheet name → player entries)
  LS_SHEETS_URL = "tournament_sheets_url_v1",   // Google Sheets URL override
  LS_BACKUP = "tournament_local_backup",    // per-tournament backup key prefix (suffixed with tournamentId)
  LS_BACKUP_LAST = "tournament_local_backup_last"; // stores the most recently active tournament id

// Default Google Apps Script endpoint (public deployment URL)
const DEFAULT_SHEETS_URL =
  "https://script.google.com/macros/s/AKfycby_FEGovdBvl8oYWU1J40NXGdbQpL-B6wKaUTq4m1O9sb81s5pku3qjM6sGA0nFBWp6VQ/exec";
