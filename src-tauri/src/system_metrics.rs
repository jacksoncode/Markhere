use sysinfo::{System, Pid};
use std::sync::Mutex;
use std::time::{Duration, Instant};

/// 全局 System 实例，避免每次调用都重新扫描所有进程
static SYSTEM: Mutex<Option<(System, Instant)>> = Mutex::new(None);
const REFRESH_INTERVAL: Duration = Duration::from_secs(60);

fn refresh_if_needed() {
    let mut guard = SYSTEM.lock().unwrap();
    let now = Instant::now();

    let needs_refresh = match guard.as_ref() {
        Some((_, last_refresh)) => now.duration_since(*last_refresh) > REFRESH_INTERVAL,
        None => true,
    };

    if needs_refresh {
        let mut system = System::new_all();
        system.refresh_all();
        *guard = Some((system, now));
    }
}

#[tauri::command]
pub async fn get_memory_usage() -> Result<u64, String> {
    refresh_if_needed();
    let guard = SYSTEM.lock().map_err(|e| e.to_string())?;

    let pid = std::process::id();
    if let Some((system, _)) = guard.as_ref() {
        if let Some(process) = system.process(Pid::from_u32(pid)) {
            return Ok(process.memory());
        }
    }
    Err("Failed to get process info".to_string())
}

#[tauri::command]
pub async fn get_cpu_usage() -> Result<f32, String> {
    // CPU 需要两次采样，这里需要单独创建 System 来计算差值
    let mut system = System::new_all();
    system.refresh_cpu();
    std::thread::sleep(std::time::Duration::from_millis(200));
    system.refresh_cpu();

    let pid = std::process::id();

    if let Some(process) = system.process(Pid::from_u32(pid)) {
        Ok(process.cpu_usage())
    } else {
        Err("Failed to get process info".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_get_memory_usage() {
        let result = get_memory_usage().await;
        assert!(result.is_ok());
        let memory = result.unwrap();
        assert!(memory > 0);
    }

    #[tokio::test]
    async fn test_get_cpu_usage() {
        let result = get_cpu_usage().await;
        assert!(result.is_ok());
        let cpu = result.unwrap();
        assert!(cpu >= 0.0);
    }
}
