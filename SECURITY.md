# Security Policy

## Reporting a Vulnerability

Report security issues privately via [GitHub Security Advisories](https://github.com/jacksoncode/Markhere/security/advisories/new). Do not open public issues for security vulnerabilities.

## Accepted Risks

The following `cargo audit` advisories are present but have been assessed as **not exploitable** in Markhere's threat model. They are documented here so reviewers can distinguish "accepted risk" from "overlooked finding".

### RUSTSEC-2026-0187 — lopdf stack overflow (CVSS 3.1)

- **Dependency chain**: `markhere` → `printpdf 0.7` → `lopdf 0.31`
- **Vulnerable function**: `lopdf::Document::load_mem` and related `load*` entry points (PDF **parser**)
- **Fix version**: lopdf 0.42.0
- **Why not upgraded**: `printpdf 0.9.1` (latest) still pins `lopdf ^0.39.0`; lopdf 0.42.0 is API-incompatible with every released printpdf version. No upstream path exists.
- **Markhere exposure**: `export_to_pdf` in `src-tauri/src/lib.rs` only **writes** PDFs via `printpdf::PdfDocument`. Markhere never calls `lopdf::Document::load_mem` or any `load*` function. The vulnerable code path is unreachable.
- **Attack vector required**: opening a crafted ~21 KB PDF file. Markhere does not accept PDF files as input — it only exports Markdown to PDF.
- **Decision**: **Accepted** — code path unreachable, no user-facing PDF parsing surface.

### RUSTSEC-2024-0411 ~ 0420 — gtk-rs GTK3 bindings unmaintained (11 advisories)

- **Dependency chain**: `markhere` → `tauri` → `gtk3-rs` (atk/gdk/gtk/glib/gtk3-macros + `-sys` variants)
- **Platform**: Linux only (GTK3 is the Linux windowing backend for Tauri 2.x)
- **Why not upgraded**: Tauri 2.x does not yet support GTK4 on Linux. Migration requires a Tauri upstream release.
- **Markhere exposure**: these are "unmaintained" informational advisories — no known exploitable vulnerability, just no upstream maintenance.
- **Decision**: **Accepted** — blocked on Tauri upstream. Tracked in `FUTURE_ROADMAP.md` P0 security section.

### RUSTSEC-2024-0429 + GHSA-wrw7-89jp-8q8g — glib unsoundness (CVSS 4.0)

- **Dependency chain**: same as gtk-rs above
- **Fix version**: glib 0.20.0 (requires gtk-rs major version bump)
- **Markhere exposure**: same as above — Linux-only, Tauri upstream dependency.
- **Decision**: **Accepted** — blocked on Tauri upstream.

### RUSTSEC-2024-0370 — proc-macro-error unmaintained

- **Dependency chain**: `markhere` → `tauri` → `gtk3-rs` → `glib-macros`/`gtk3-macros` → `proc-macro-error`
- **Markhere exposure**: informational only, no exploitable vulnerability. Build-time only.
- **Decision**: **Accepted** — blocked on gtk-rs upstream.

### RUSTSEC-2025-0075, 0080, 0081, 0098, 0100 — unic-* unmaintained (5 advisories)

- **Dependency chain**: `markhere` → `tauri` → `tauri-utils` → `urlpattern 0.3` → `unic-ucd-ident` → `unic-*`
- **Markhere exposure**: informational only, no exploitable vulnerability.
- **Decision**: **Accepted** — blocked on Tauri upstream (urlpattern).

## CI Configuration

`cargo audit` runs in the Build workflow (`.github/workflows/build.yml`) with `continue-on-error: true` — it reports findings but does not block builds. This is intentional: all current findings are either accepted (see above) or blocked on upstream.

## Hardening Roadmap

The following security improvements are tracked in [`FUTURE_ROADMAP.md`](./FUTURE_ROADMAP.md) P0:

- [ ] CSP `unsafe-eval` removal (hash-fence Mermaid/KaTeX inline scripts)
- [ ] Plugin sandbox (current `PluginLoader` uses `new Function()` — no isolation)
- [ ] `npm audit` / `cargo audit` failure threshold (once upstream blockers resolve)
- [ ] `safeInvoke` full coverage on all Tauri IPC calls
