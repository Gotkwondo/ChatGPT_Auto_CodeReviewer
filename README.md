# ChatGPT_Auto_CodeReviewer

자동화된 GitHub PR 코드 리뷰 액션 패키지

## 소개
ChatGPT_Auto_CodeReviewer는 GitHub Pull Request(PR)에 대해 자동으로 코드 리뷰를 수행하는 GitHub Actions 패키지입니다. OpenAI의 GPT 모델을 활용하여 코드 품질, 버그, 개선점 등을 리뷰 코멘트로 남깁니다.

## 사용법

1. **OpenAI API Key 등록**
   - 리뷰를 받고자 하는 레포지토리의 `Settings > Secrets and variables > Actions > Repository secrets`에 `OPENAI_API_KEY`를 추가합니다.
   - 예시:  
     ```
     OPENAI_API_KEY: <본인의 OpenAI API Key>
     ```

2. **워크플로우 파일 추가**
   - 리뷰를 받을 레포지토리의 `.github/workflows` 폴더에 워크플로우 파일을 추가합니다.
   
   ### 기본 사용 (요약 코멘트만)
   
   ```yaml
   name: GPT PR Code Review

   on:
     pull_request:
       types: [opened, synchronize, reopened]

   jobs:
     gpt-review:
       name: Run GPT Code Reviewer
       runs-on: ubuntu-latest
       permissions:
         contents: read
         pull-requests: write
       steps:
         - uses: Gotkwondo/ChatGPT_Auto_CodeReviewer@main
           env:
             GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
             OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
   ```

   ### 고급 사용 (라인 단위 리뷰 + 커스터마이징)

   ```yaml
   name: GPT PR Code Review

   on:
     pull_request:
       types: [opened, synchronize, reopened]

   jobs:
     gpt-review:
       name: Run GPT Code Reviewer
       runs-on: ubuntu-latest
       permissions:
         contents: read
         pull-requests: write
       steps:
         - uses: Gotkwondo/ChatGPT_Auto_CodeReviewer@main
           with:
             openai_api_key: ${{ secrets.OPENAI_API_KEY }}
             review_mode: 'both'           # 'summary', 'line', 또는 'both'
             review_role: 'fullstack'      # 'frontend', 'backend', 'fullstack', 또는 'default'
             openai_model: 'gpt-4o-mini'   # 사용할 OpenAI 모델
             exclude_patterns: '*.log,temp/**'  # 추가 제외 패턴 (선택)
             max_file_lines: '1000'        # 파일당 최대 변경 라인 수 (선택)
           env:
             GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
   ```

3. **PR 생성 시 자동 리뷰**
   - PR이 생성, 수정, 다시 열릴 때마다 자동으로 GPT 기반 코드 리뷰가 실행됩니다.
   - **요약 모드**: PR에 요약 코멘트 1개가 달립니다.
   - **라인 모드**: GitHub의 "Files changed" 탭에서 라인별 코멘트를 확인할 수 있습니다.
   - **둘 다 모드**: 요약 코멘트 + 라인별 코멘트 모두 제공됩니다.

## 설정 옵션

| 옵션 | 설명 | 기본값 | 가능한 값 |
|------|------|--------|-----------|
| `openai_api_key` | OpenAI API 키 (필수) | - | API 키 문자열 |
| `review_mode` | 리뷰 전달 방식 | `summary` | `summary`, `line`, `both` |
| `review_role` | 리뷰어 역할/관점 | `default` | `frontend`, `backend`, `fullstack`, `default` |
| `openai_model` | 사용할 OpenAI 모델 | `gpt-4o-mini` | 유효한 OpenAI 모델명 |
| `exclude_patterns` | 추가 제외 패턴 (쉼표 구분) | `''` | `"*.log,temp/**,*.generated.ts"` |
| `max_file_lines` | 파일당 최대 변경 라인 수 (0=무제한) | `1000` | `500`, `0` |

### review_mode 상세

- `summary`: PR에 요약 코멘트 1개만 달립니다 (기존 동작)
- `line`: 특정 파일·라인에 대한 코드 리뷰 코멘트를 GitHub의 "Files changed" 탭에 달립니다
- `both`: 요약 코멘트 + 라인별 코멘트 모두 제공합니다

### review_role 상세

- `frontend`: 프론트엔드 개발자 관점에서 리뷰
- `backend`: 백엔드 개발자 관점에서 리뷰
- `fullstack`: 풀스택 개발자 관점에서 리뷰
- `default`: 일반적인 개발팀 리더 관점에서 리뷰

## 자동 제외되는 파일

다음 파일들은 자동으로 리뷰에서 제외됩니다:

### 테스트 파일
- `__tests__/**`
- `*.test.js`, `*.test.ts`
- `*.spec.js`, `*.spec.ts`

### Lock 파일
- `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`
- `poetry.lock`, `Gemfile.lock`, `Cargo.lock`, `composer.lock`

### 빌드 산출물
- `dist/**`, `build/**`, `.next/**`, `out/**`
- `coverage/**`, `.nuxt/**`

### 생성 파일
- `*.d.ts`, `*.map`, `*.min.js`, `*.min.css`
- `*.bundle.js`

### 설정 파일
- `.env`, `.env.*`
- `*.config.js`, `*.config.ts`
- `tsconfig.json`, `jsconfig.json`

### 문서 파일
- `*.md`, `docs/**`, `documentation/**`
- `LICENSE`, `CHANGELOG.md`

### 사용자 정의 제외

추가로 제외하고 싶은 파일이 있다면 `exclude_patterns` 옵션을 사용하세요:

```yaml
- uses: Gotkwondo/ChatGPT_Auto_CodeReviewer@main
  with:
    exclude_patterns: '*.log,temp/**,scripts/generated/**'
```

### 파일 크기 제한

기본적으로 1000줄 이상 변경된 파일은 제외됩니다. 이 값을 조정하려면:

```yaml
- uses: Gotkwondo/ChatGPT_Auto_CodeReviewer@main
  with:
    max_file_lines: '500'    # 500줄로 제한
    # max_file_lines: '0'    # 무제한 (모든 파일 리뷰)
```

## 참고
- OpenAI API Key는 반드시 본인의 계정에서 발급받아야 하며, 외부에 노출되지 않도록 주의하세요.
- 자세한 설정 및 커스터마이징은 [GitHub Actions 공식 문서](https://docs.github.com/en/actions) 참고.

---
문의 및 개선 제안은 이슈로 남겨주세요.