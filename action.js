import { Octokit } from "octokit";
import { readFileSync } from "fs";
import { getReviewFromGPT } from "./openai.js";
import { shouldExcludeFile } from "./utils.js";

const token = process.env.GITHUB_TOKEN;
const octokit = new Octokit({ auth: token });

const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");

// Get PR number from event payload (safer than GITHUB_REF parsing)
const getPullNumber = () => {
  try {
    const eventPath = process.env.GITHUB_EVENT_PATH;
    if (eventPath) {
      const event = JSON.parse(readFileSync(eventPath, "utf8"));
      if (event.pull_request && event.pull_request.number) {
        return event.pull_request.number;
      }
    }
  } catch (err) {
    console.warn("⚠️ Failed to read event payload, falling back to GITHUB_REF");
  }
  // Fallback to GITHUB_REF parsing
  return process.env.GITHUB_REF.split("/")[2];
};

const pull_number = getPullNumber();

// Read inputs from GitHub Actions
const reviewMode = process.env.INPUT_REVIEW_MODE || "summary";
const reviewRole = process.env.INPUT_REVIEW_ROLE || "default";
const openaiModel = process.env.INPUT_OPENAI_MODEL || "gpt-4o-mini";
const excludePatterns = process.env.INPUT_EXCLUDE_PATTERNS
  ? process.env.INPUT_EXCLUDE_PATTERNS.split(",")
      .map((p) => p.trim())
      .filter(Boolean)
  : [];
const maxFileLines = parseInt(process.env.INPUT_MAX_FILE_LINES || "1000", 10);

async function postErrorComment(error) {
  try {
    const errorMessage = `### ❌ 리뷰 생성 중 오류 발생

리뷰를 생성하는 동안 오류가 발생했습니다:

\`\`\`
${error.message || error}
\`\`\`

나중에 다시 시도해 주세요.`;

    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: pull_number,
      body: errorMessage,
    });
  } catch (commentError) {
    console.error("❌ Failed to post error comment:", commentError);
  }
}

async function run() {
  const filesRes = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number,
  });

  const changed = [];
  const excluded = [];

  for (const file of filesRes.data) {
    // GitHub API의 file.changes 필드 사용 (총 변경 라인 수)
    // file.changes = file.additions + file.deletions
    const changesCount = file.changes || 0;

    const { exclude, reason } = shouldExcludeFile(
      file.filename,
      excludePatterns,
      maxFileLines,
      changesCount
    );

    if (exclude) {
      excluded.push({ filename: file.filename, reason });
    } else {
      changed.push(file);
    }
  }

  // 제외된 파일 로그
  if (excluded.length > 0) {
    console.log(`🚫 제외된 파일 (${excluded.length}개):`);
    excluded.forEach(({ filename, reason }) => {
      console.log(`  - ${filename} (${reason})`);
    });
  }

  const patches = changed
    .map((file) => `File: ${file.filename}\n${file.patch}`)
    .join("\n\n");

  if (!patches) {
    const message =
      excluded.length > 0
        ? `✅ 리뷰할 코드 없음 (${excluded.length}개 파일 제외됨)`
        : "✅ 리뷰할 코드 없음";
    console.log(message);
    return;
  }

  console.log(`📝 리뷰 모드: ${reviewMode}, 역할: ${reviewRole}, 모델: ${openaiModel}`);

  const { summary, lineComments } = await getReviewFromGPT(patches, {
    model: openaiModel,
    reviewRole,
    reviewMode,
  });

  // Post summary comment if in summary or both mode
  if (reviewMode === "summary" || reviewMode === "both") {
    if (summary) {
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: pull_number,
        body: summary,
      });
      console.log("✅ 요약 코멘트 등록 완료!");
    }
  }

  // Post line-level review if in line or both mode
  if ((reviewMode === "line" || reviewMode === "both") && lineComments.length > 0) {
    try {
      // Filter out invalid line comments (GitHub API may reject invalid lines)
      const validComments = [];
      for (const comment of lineComments) {
        // Basic validation
        if (comment.path && comment.line && comment.body) {
          validComments.push({
            path: comment.path,
            line: comment.line,
            body: comment.body,
          });
        }
      }

      if (validComments.length > 0) {
        await octokit.rest.pulls.createReview({
          owner,
          repo,
          pull_number,
          event: "COMMENT",
          body: reviewMode === "line" ? summary : "라인별 상세 리뷰:",
          comments: validComments,
        });
        console.log(`✅ 라인 리뷰 등록 완료! (${validComments.length}개 코멘트)`);
      } else {
        console.log("⚠️ 유효한 라인 코멘트가 없습니다.");
      }
    } catch (reviewError) {
      console.error("❌ 라인 리뷰 등록 실패:", reviewError.message);
      // Fallback to summary comment if line review fails
      if (reviewMode === "line") {
        await octokit.rest.issues.createComment({
          owner,
          repo,
          issue_number: pull_number,
          body: summary + "\n\n⚠️ 라인 단위 리뷰 등록에 실패했습니다.",
        });
      }
    }
  }

  console.log("✅ 리뷰 완료!");
}

run().catch(async (err) => {
  console.error("❌ 에러 발생:", err);
  await postErrorComment(err);
  process.exit(1);
});
