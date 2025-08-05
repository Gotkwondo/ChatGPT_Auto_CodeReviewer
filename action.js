import { Octokit } from "octokit";
import { getReviewFromGPT } from "./openai.js";
import { isTestFile } from "./utils.js";

const token = process.env.GITHUB_TOKEN;
const octokit = new Octokit({ auth: token });

const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");
const pull_number = process.env.GITHUB_REF.split("/")[2];

async function run() {
  const filesRes = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number,
  });
  const changed = filesRes.data.filter((file) => !isTestFile(file.filename));

  const patches = changed
    .map((file) => `File: ${file.filename}\n${file.patch}`)
    .join("\n\n");

  if (!patches) {
    console.log("✅ 리뷰할 코드 없음 (테스트 파일만 변경됨)");
    return;
  }

  const review = await getReviewFromGPT(patches);

  await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: pull_number,
    body: review,
  });

  console.log("✅ 리뷰 완료!");
}

run().catch((err) => {
  console.error("❌ 에러 발생:", err);
  process.exit(1);
});
