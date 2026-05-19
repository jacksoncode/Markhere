use markhere_lib::{GitCommit, GitDiff};
use serde_json;

#[test]
fn test_git_commit_fields() {
    let commit = GitCommit {
        hash: "abc123".to_string(),
        short_hash: "abc".to_string(),
        author: "Tester".to_string(),
        date: "2025-01-01".to_string(),
        message: "Initial commit".to_string(),
    };
    assert_eq!(commit.hash, "abc123");
    assert_eq!(commit.short_hash, "abc");
    assert_eq!(commit.author, "Tester");
    assert_eq!(commit.date, "2025-01-01");
    assert_eq!(commit.message, "Initial commit");
}

#[test]
fn test_git_diff_fields() {
    let diff = GitDiff {
        old_content: "old".to_string(),
        new_content: "new".to_string(),
        additions: 5,
        deletions: 3,
    };
    assert_eq!(diff.old_content, "old");
    assert_eq!(diff.new_content, "new");
    assert_eq!(diff.additions, 5);
    assert_eq!(diff.deletions, 3);
}

#[test]
fn test_git_commit_serialization() {
    let commit = GitCommit {
        hash: "def456".to_string(),
        short_hash: "def".to_string(),
        author: "Dev".to_string(),
        date: "2025-02-01".to_string(),
        message: "Fix bug".to_string(),
    };
    let json = serde_json::to_string(&commit).unwrap();
    assert!(json.contains("def456"));
    assert!(json.contains("Fix bug"));

    let deserialized: GitCommit = serde_json::from_str(&json).unwrap();
    assert_eq!(deserialized.hash, commit.hash);
    assert_eq!(deserialized.message, commit.message);
}

#[test]
fn test_git_diff_serialization() {
    let diff = GitDiff {
        old_content: "before".to_string(),
        new_content: "after".to_string(),
        additions: 10,
        deletions: 2,
    };
    let json = serde_json::to_string(&diff).unwrap();
    assert!(json.contains("before"));
    assert!(json.contains("after"));

    let deserialized: GitDiff = serde_json::from_str(&json).unwrap();
    assert_eq!(deserialized.old_content, diff.old_content);
    assert_eq!(deserialized.new_content, diff.new_content);
    assert_eq!(deserialized.additions, diff.additions);
    assert_eq!(deserialized.deletions, diff.deletions);
}
