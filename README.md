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
   - 예시 (`.github/workflows/review.yml`):

     ```yaml
     name: GPT PR Code Review

     on:
       pull_request:
         types: [opened, synchronize, reopened]

     jobs:
       gpt-review:
         name: Run GPT Code Reviewer
         runs-on: ubuntu-latest
         steps:
           - uses: Gotkwondo/ChatGPT_Auto_CodeReviewer@main
             env:
               GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
               OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
     ```

3. **PR 생성 시 자동 리뷰**
   - PR이 생성, 수정, 다시 열릴 때마다 자동으로 GPT 기반 코드 리뷰가 실행됩니다.

## 참고
- OpenAI API Key는 반드시 본인의 계정에서 발급받아야 하며, 외부에 노출되지 않도록 주의하세요.
- 자세한 설정 및 커스터마이징은 [GitHub Actions 공식 문서](https://docs.github.com/en/actions) 참고.

---
문의 및 개선 제안은 이슈로 남겨주세요.