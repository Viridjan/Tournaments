// ═══════════════════════════════════════════════════════
// Global constants — loaded before all other scripts

// localStorage keys
const LS_ELO_DB      = "tournament_elo_db_v2",
  LS_SHEETS_URL      = "tournament_sheets_url_v1",
  LS_BACKUP          = "tournament_local_backup",
  LS_BACKUP_LAST     = "tournament_local_backup_last";

// Default Google Apps Script endpoint (public deployment URL)
// TODO: remove this so the app starts with no URL and prompts on first load
const DEFAULT_SHEETS_URL =
  "https://script.google.com/macros/s/AKfycby_FEGovdBvl8oYWU1J40NXGdbQpL-B6wKaUTq4m1O9sb81s5pku3qjM6sGA0nFBWp6VQ/exec";
