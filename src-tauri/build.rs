fn main() {
    tauri_build::try_build(
        tauri_build::Attributes::new().windows_attributes(
            // Custom Windows manifest: enables long-path support (> MAX_PATH = 260)
            // and keeps the Common Controls v6 dependency required by the dialog APIs.
            tauri_build::WindowsAttributes::new()
                .app_manifest(include_str!("manifest.xml")),
        ),
    )
    .expect("failed to run tauri-build");
}
