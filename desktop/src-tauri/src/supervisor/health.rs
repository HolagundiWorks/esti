//! Health probing + restart policy for supervised processes (backend node, and
//! later Ollama). The Manager watches each process and restarts it on
//! crash/health failure — but a crash-looping process must not be restarted
//! forever, so the policy enforces exponential backoff and gives up after too
//! many restarts inside a rolling window (surfaced to the user in the status
//! window instead of thrashing).

use std::time::Duration;

/// A single readiness probe: is `GET {base}/readyz` returning 200?
pub async fn probe(base: &str) -> bool {
    let url = format!("{base}/readyz");
    matches!(
        reqwest::Client::new()
            .get(&url)
            .timeout(Duration::from_secs(5))
            .send()
            .await,
        Ok(resp) if resp.status().is_success()
    )
}

#[derive(Debug, PartialEq, Eq)]
pub enum RestartDecision {
    /// Restart after waiting this many milliseconds (exponential backoff).
    Restart { after_ms: u64 },
    /// Too many restarts in the window — stop and report to the user.
    GiveUp,
}

/// Crash-loop-safe restart policy. Time is passed in (monotonic millis) so the
/// decision logic is pure and unit-testable.
pub struct RestartPolicy {
    max_in_window: u32,
    window_ms: u64,
    base_backoff_ms: u64,
    max_backoff_ms: u64,
    events: Vec<u64>,
}

impl RestartPolicy {
    pub fn new(max_in_window: u32, window_ms: u64, base_backoff_ms: u64, max_backoff_ms: u64) -> Self {
        Self { max_in_window, window_ms, base_backoff_ms, max_backoff_ms, events: Vec::new() }
    }

    /// Sensible default: up to 5 restarts per 60s, backoff 1s→30s.
    pub fn default_backend() -> Self {
        Self::new(5, 60_000, 1_000, 30_000)
    }

    /// Record a crash at `now_ms` and decide what to do. Prunes events outside
    /// the rolling window first, so recovery over time re-arms restarts.
    pub fn record_and_decide(&mut self, now_ms: u64) -> RestartDecision {
        self.events.retain(|&t| now_ms.saturating_sub(t) < self.window_ms);
        self.events.push(now_ms);
        if self.events.len() as u32 > self.max_in_window {
            return RestartDecision::GiveUp;
        }
        // Backoff grows with consecutive restarts in the window: base * 2^(n-1), capped.
        let n = self.events.len() as u32;
        let shift = n.saturating_sub(1).min(20);
        let after = self.base_backoff_ms.saturating_mul(1u64 << shift).min(self.max_backoff_ms);
        RestartDecision::Restart { after_ms: after }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn backs_off_exponentially_then_gives_up() {
        let mut p = RestartPolicy::new(5, 60_000, 1_000, 30_000);
        // 5 crashes clustered in the window → escalating backoff, all allowed.
        assert_eq!(p.record_and_decide(0), RestartDecision::Restart { after_ms: 1_000 });
        assert_eq!(p.record_and_decide(1_000), RestartDecision::Restart { after_ms: 2_000 });
        assert_eq!(p.record_and_decide(2_000), RestartDecision::Restart { after_ms: 4_000 });
        assert_eq!(p.record_and_decide(3_000), RestartDecision::Restart { after_ms: 8_000 });
        assert_eq!(p.record_and_decide(4_000), RestartDecision::Restart { after_ms: 16_000 });
        // 6th within the window → give up.
        assert_eq!(p.record_and_decide(5_000), RestartDecision::GiveUp);
    }

    #[test]
    fn backoff_is_capped() {
        let mut p = RestartPolicy::new(100, 10_000_000, 1_000, 5_000);
        let mut last = RestartDecision::GiveUp;
        for i in 0..10 {
            last = p.record_and_decide(i);
        }
        assert_eq!(last, RestartDecision::Restart { after_ms: 5_000 });
    }

    #[test]
    fn recovers_after_window_passes() {
        let mut p = RestartPolicy::new(2, 60_000, 1_000, 30_000);
        assert!(matches!(p.record_and_decide(0), RestartDecision::Restart { .. }));
        assert!(matches!(p.record_and_decide(1_000), RestartDecision::Restart { .. }));
        assert_eq!(p.record_and_decide(2_000), RestartDecision::GiveUp);
        // Long after the window, old events are pruned → restarts re-armed.
        assert_eq!(p.record_and_decide(200_000), RestartDecision::Restart { after_ms: 1_000 });
    }
}
