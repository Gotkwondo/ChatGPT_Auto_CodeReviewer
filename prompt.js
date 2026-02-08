const getRoleDescription = (reviewRole) => {
  const roles = {
    frontend: "프론트엔드 시니어 개발자로서",
    backend: "백엔드 시니어 개발자로서",
    fullstack: "풀스택 시니어 개발자로서",
    default: "프론트엔드 시니어 개발자 혹은 개발팀 리더로서",
  };
  return roles[reviewRole] || roles.default;
};

export const generatePrompt = (input, options = {}) => {
  const { reviewRole = "default", reviewMode = "summary" } = options;
  const roleDescription = getRoleDescription(reviewRole);

  let formatInstructions = `
    ### Format:
    리뷰는 한글로 작성하고 다음 형식으로 작성해 주세요:
    ### 🔍 코드 리뷰 피드백
    #### 👍 좋은 점
    - ✅ ...

    #### 🐞 문제점
    - ❗ ...

    #### 💡 개선 사항
    - 🛠️ ...

    #### 🦺 추후 고려해야하는 문제점 및 이슈
    - ⚠️ ...

    #### 💾 참고하면 좋은 자료
    - 📚 ...
  `;

  if (reviewMode === "line" || reviewMode === "both") {
    formatInstructions += `

    ### Line-level Comments:
    위 요약 리뷰 후, 특정 파일·라인에 대한 상세 코멘트를 아래 JSON 배열 형식으로 출력해 주세요.
    라인 번호는 diff에서 변경된 파일의 새 버전(+ 기호로 표시된 라인) 기준 라인 번호를 사용하세요.
    diff 형식: @@ -a,b +c,d @@에서 +c는 새 파일의 시작 라인 번호입니다.
    
    **중요**: JSON 배열은 반드시 \`\`\`json 코드 블록 안에 작성하세요.
    
    \`\`\`json
    [
      {
        "path": "파일경로",
        "line": 라인번호,
        "body": "코멘트 내용"
      }
    ]
    \`\`\`
    
    라인 코멘트가 없으면 빈 배열 []을 출력하세요.
  `;
  }

  return `
    ### Objective:
    PR(Pull Request) 리뷰를 위한 프롬프트입니다.
    ### Context:
    다음은 기존 main 브렌치를 base로 둔 신규 PR(Pull Request)에 대한 변경된 코드입니다: \n\n${input}\n\n
    ### Role:
    당신은 ${roleDescription}, 해당 PR에 대해 리뷰를 진행해야 합니다.\n
    ### Task:
    PR에 대한 리뷰를 진행하고, 다음 사항들을 검토하고 문제점과 개선사항, 좋은 점, 참고하면 좋은 자료에 대한 피드백을 작성해 주세요:
    - 코드의 품질, 가독성, 유지보수성
    - 성능과 효율성
    - 보안
    - 스타일
    - 추후 발생할 수 있는 이슈
${formatInstructions}
  `;
};
