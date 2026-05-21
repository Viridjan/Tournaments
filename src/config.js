// ═══════════════════════════════════════════════════════
// Global constants — loaded before all other scripts

// ELO system defaults
const ED = 1000, // ED — default starting ELO for new players
  EM = 50,       // EM — max K-factor (ELO sensitivity per match)
  ES = 500,      // ES — ELO scale (controls rating spread; higher = flatter curve)

// localStorage keys
  EK = "tournament_elo_db_v2",       // EK — ELO database (keyed by sheet name → player entries)
  SK = "tournament_sheets_url_v1",   // SK — Google Sheets URL override
  BK = "tournament_local_backup",    // BK — per-tournament backup key prefix (suffixed with tournamentId)
  BK_LAST = "tournament_local_backup_last"; // BK_LAST — stores the most recently active tournament id

// Default Google Apps Script endpoint (public deployment URL)
const DU =
  "https://script.google.com/macros/s/AKfycby_FEGovdBvl8oYWU1J40NXGdbQpL-B6wKaUTq4m1O9sb81s5pku3qjM6sGA0nFBWp6VQ/exec";
