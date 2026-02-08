// 기본 제외 패턴들
const DEFAULT_EXCLUDE_PATTERNS = {
  // Lock 파일
  lockFiles: [
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "poetry.lock",
    "Gemfile.lock",
    "Cargo.lock",
    "composer.lock",
  ],

  // 빌드 산출물
  buildOutput: [
    "dist/**",
    "build/**",
    ".next/**",
    "out/**",
    "coverage/**",
    ".nuxt/**",
    "public/build/**",
  ],

  // 생성 파일
  generatedFiles: [
    "*.d.ts",
    "*.map",
    "*.min.js",
    "*.min.css",
    "*.bundle.js",
    "*-lock.json",
  ],

  // 설정 파일
  configFiles: [
    ".env",
    ".env.*",
    "*.config.js",
    "*.config.ts",
    "tsconfig.json",
    "jsconfig.json",
  ],

  // 문서 파일
  docs: ["*.md", "docs/**", "documentation/**", "LICENSE", "CHANGELOG.md"],
};

/**
 * 간단한 glob 패턴을 정규식으로 변환
 * 지원: *, **, ?, 정확한 문자열 매칭
 */
function globToRegex(pattern) {
  // 특수 문자 이스케이프 (., +, ^, $, ( 등)
  let regex = pattern
    .replace(/[.+^$(){}[\]|\\]/g, "\\$&")
    // ** -> 모든 경로 세그먼트 (0개 이상)
    .replace(/\*\*/g, "@@DOUBLE_STAR@@")
    // * -> 한 세그먼트 내 모든 문자 (/ 제외)
    .replace(/\*/g, "[^/]*")
    // ? -> 한 문자
    .replace(/\?/g, ".")
    // ** 복원
    .replace(/@@DOUBLE_STAR@@/g, ".*");

  return new RegExp(`^${regex}$`);
}

/**
 * 파일명이 glob 패턴과 매칭되는지 확인
 * GitHub Actions 환경에서 테스트됨
 */
function matchesPattern(filename, pattern) {
  // 정확한 문자열 매칭 (패턴에 glob 문자가 없는 경우)
  if (!pattern.includes("*") && !pattern.includes("?")) {
    return filename === pattern || filename.endsWith("/" + pattern);
  }

  const regex = globToRegex(pattern);
  return regex.test(filename);
}

export function isTestFile(filename) {
  return (
    filename.includes("__tests__") ||
    /\.test\./.test(filename) ||
    /\.spec\./.test(filename)
  );
}

/**
 * 파일을 제외해야 하는지 판단하는 통합 함수
 * @param {string} filename - 파일명
 * @param {string[]} customPatterns - 사용자 정의 제외 패턴
 * @param {number} maxLines - 최대 라인 수 (0이면 무제한)
 * @param {number} fileChanges - 파일 변경 라인 수
 * @returns {{exclude: boolean, reason: string|null}} 제외 여부와 이유
 */
export function shouldExcludeFile(
  filename,
  customPatterns = [],
  maxLines = 0,
  fileChanges = 0
) {
  // 1. 테스트 파일 체크
  if (isTestFile(filename)) {
    return { exclude: true, reason: "test file" };
  }

  // 2. 기본 제외 패턴 체크
  for (const [category, patterns] of Object.entries(DEFAULT_EXCLUDE_PATTERNS)) {
    if (patterns.some((pattern) => matchesPattern(filename, pattern))) {
      return { exclude: true, reason: category };
    }
  }

  // 3. 사용자 정의 패턴 체크
  if (customPatterns.length > 0) {
    if (customPatterns.some((pattern) => matchesPattern(filename, pattern))) {
      return { exclude: true, reason: "custom pattern" };
    }
  }

  // 4. 파일 크기 체크 (라인 수)
  if (maxLines > 0 && fileChanges > maxLines) {
    return { exclude: true, reason: `exceeds ${maxLines} lines` };
  }

  return { exclude: false, reason: null };
}
