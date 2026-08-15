---
name: commit-convention
description: Prepare, validate, and document Git commits for this project. Use whenever an AI Agent is asked to stage changes, write a commit message, create a commit, split commits, inspect staged changes, or prepare a Pull Request.
---

# Commit Convention

Create small, traceable commits that match the project convention. Do not stage or create a commit until the user reviews and explicitly approves the exact commit plan.

## Build the Commit Plan

1. Read `docs/CONVENTIONS.md` and the related Issue or Discussion.
2. Inspect the working tree and identify unrelated changes.
3. Preserve changes that belong to another team member or another task.
4. Split independent changes into separate commits when they can be reviewed separately.
5. Keep tightly coupled code, types, and required error handling together when splitting would leave an incoherent commit.
6. Order dependent commits so shared contracts and configuration come before the code that consumes them.

Present the plan in this format and stop for approval.

```md
## Commit Plan

1. `<type>(<scope>): <summary>`
   - Files: `path/to/file`
   - Purpose: why this change exists
   - Why separate: why it should not be combined with another commit
   - Validation: command or manual check

Approval needed: Should I create these commits in this order?
```

Do not run `git add` or `git commit` until the user explicitly approves the plan. Treat a request to “commit everything” as a request to prepare the plan, not approval to skip review.

## Execute an Approved Plan

1. Stage only the files in the approved commit group.
2. Inspect the staged diff, not only the working tree.
3. Confirm that the staged files still match the approved plan.
4. If the plan changed, stop and request a new user review.
5. Check that no `.env`, secret, generated artifact, or unrelated file is staged.
6. Run the smallest relevant validation command available and record only actual results.
7. Create the approved commit, then repeat for the next approved group.

## Commit Message

Use the following format.

```text
<type>(<scope>): <한국어 작업 요약>
```

Allowed types: `feat`, `fix`, `refactor`, `docs`, `design`, `chore`, `test`, `style`, `perf`, `ci`.

Examples:

```text
feat(auth): 로그인 완료 후 사용자 정보 저장
fix(socket): 재연결 시 상태 동기화 오류 수정
docs(convention): 커밋 전 확인 절차 추가
```

## Finish

After a successful commit, report the commit hash, message, changed files, and validation that actually ran. Do not claim a commit, test, review, approval, or push that did not occur.
