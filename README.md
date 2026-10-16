# G9BON · Personal Space

프로필·프로젝트·개발 블로그·기타 블로그를 모으는 Astro 정적 웹사이트입니다. 화이트 3D 홈과 다크 터미널이 같은 콘텐츠를 사용합니다. 현재 이름·소개·글·프로젝트는 교체 가능한 예제입니다.

## 시작하기

Node.js **22.19 이상**을 사용합니다. `.nvmrc`는 Node 22 LTS를 지정하며 패키지 버전은 lockfile에 고정되어 있습니다.

```sh
nvm install
nvm use
npm ci
npm run dev
```

표시된 로컬 주소로 접속합니다. 개발 서버에서는 글과 스타일을 바로 수정할 수 있습니다. 본문 전체 검색을 확인하려면 빌드 후 미리보기를 사용합니다.

```sh
npm run check
npm test
npm run build
npm run preview
```

개발 모드에 Pagefind 인덱스가 없으면 검색은 제목·요약·태그를 대상으로 작동합니다. `build`는 콘텐츠 원본 검증 → Astro → Pagefind → 링크·앵커·초안 제외 검증을 실행합니다.

## 수정할 위치

| 작업                       | 파일                                                         |
| -------------------------- | ------------------------------------------------------------ |
| 이름·소개·기술·이력·연락처 | `content/profile/profile.json`                               |
| 개발 글 / 기타 글          | `content/posts/dev/`, `content/posts/life/`                  |
| 프로젝트 설명              | `content/projects/`                                          |
| 외부 블로그 링크           | `content/external-blogs.json`                                |
| 내비게이션                 | `src/config/site.ts`                                         |
| 색·폰트·간격·공통 스타일   | `src/designs/studio/styles/theme.css`                        |
| Markdown 본문 스타일       | `src/designs/studio/styles/prose.css`                        |
| 홈·목록·상세 구성          | `src/designs/studio/views/`                                  |
| 3D 장면 / 정적 폴백        | `src/designs/studio/hero/`, `public/designs/studio/desk.svg` |
| 전체 디자인 교체           | `src/presentation/active-design.ts`                          |

자세한 글 작성 방법은 [콘텐츠 작성 안내](docs/콘텐츠-작성.md), 책임과 import 규칙은 [아키텍처 상세](docs/아키텍처-상세.md)를 참고하세요.

## 검증

```sh
npx playwright install chromium
npm run test:e2e
npm run test:base
```

브라우저 테스트는 빌드 산출물을 사용합니다. 검색·필터·터미널·색상 설정·모바일·JavaScript 비활성 상태·실제 3D를 확인합니다. 화면 캡처는 `test-results/previews/`에 저장합니다. 소프트웨어 WebGL을 사용하는 테스트 환경과 실제 기기의 성능은 다를 수 있습니다.

`test:base`는 `/profile/` 하위 경로로 빌드해 검색·탐색·RSS를 브라우저에서 확인한 뒤 원래 빌드 설정으로 산출물을 복원합니다. 코드 형식은 `npm run format`, 검사만 하려면 `npm run format:check`를 사용합니다.

Astro가 에이전트 환경에서 서버를 백그라운드로 실행했다면 `npx astro preview status`, `npx astro preview stop`으로 관리할 수 있습니다. E2E의 서버 명령은 `--ignore-lock`으로 foreground 실행합니다.

## GitHub Pages

공개 사이트: https://gubongyu.github.io · 저장소: https://github.com/gubongyu/gubongyu.github.io

1. 저장소 Settings → Pages → Source를 **GitHub Actions**로 설정합니다.
2. Actions 변수 `SITE_URL`에 실제 origin을 설정합니다. 예: `https://username.github.io`.
3. `BASE_PATH`는 사용자 사이트면 `/`, 프로젝트 사이트면 `/repository-name/`로 설정합니다.
4. 예제 프로필·글·프로젝트를 실제 정보로 교체하고 `sample: false`로 변경합니다.
5. **Verify and deploy** 워크플로를 수동 실행하고 `deploy`를 선택하면 검증 후 배포합니다.

push/PR에서는 검사와 빌드만 실행하고 실제 공개는 수동으로 실행합니다. `SITE_URL` 미설정 시 임시 origin과 `noindex`를 사용합니다. 예제 상세와 예제 프로필도 `noindex`로 표시합니다.

## 디자인 크레딧

디자인 과정에서 AI의 도움을 받았습니다.

로컬 배포 경로 검증은 `.env.example`을 `.env`로 복사해 값을 설정하거나 환경 변수를 전달합니다.

```sh
SITE_URL=https://username.github.io BASE_PATH=/repository-name/ npm run build
```

정적 사이트이므로 변경 사항과 예약 발행 시각은 **다시 빌드한 뒤** 반영됩니다. 로그인·DB·실시간 좋아요·영어 번역·외부 블로그 본문 동기화는 현재 포함하지 않습니다.
