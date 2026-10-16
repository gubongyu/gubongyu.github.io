# met·a·round 콘텐츠 구성과 근거

작성일: 2026-10-12

## 콘텐츠와 연출의 역할

- `content/projects/met-a-round.md`: 프로젝트 목적, 담당 역할, 구현 설명과 한계.
- `content/project-stages/met-a-round/*.md`: 원본 파이프라인 순서에 대응하는 10개 단계의 제목·요약·자세한 설명. `order`는 1~10, 화면 STEP 표시는 00~09다.
- `content/posts/dev/metaroom-fragmentation.md`: 재구성 파편화 원인 분석을 정리한 첫 실험 글.
- `src/features/project-pipeline/`: Three.js 장면, 스크롤 진행도와 리소스 수명 관리.
- `src/designs/studio/components/ProjectPipeline.astro`: 파이프라인 화면과 정적 대체 콘텐츠.
- `public/projects/met-a-round/pipeline/`: 원본 시연용 이미지와 기하 데이터. 이 데이터는 브라우저에서 모델을 실행한 결과가 아니라 미리 준비한 시각화 자료다.

## 원본 자료

### 프로젝트와 파이프라인

원본 루트: `/home/g9bon/project/graduation_project/AI-WEB`

- `app/page.tsx`: 프로젝트 랜딩 구성.
- `components/landing/Developers.tsx`: 구본규 담당 역할 AI (3D Vision), 다중 뷰 기하·벽선 추출·병합. 팀 백엔드·클라이언트 역할은 개인 기여에 포함하지 않았다.
- `lib/landing/steps.ts`: 10단계 설명과 순서.
- `components/landing/Pipeline.tsx`, `lib/landing/pipelineStory.ts`, `lib/landing/scroll.ts`: 스크롤 시연과 카메라/장면 흐름.
- `public/pipeline/`: 단계 이미지와 시연 자산. 개발자 사진이나 전체 원본 앱 번들은 옮기지 않는다.

### 첫 실험 기록

원본 루트: `/home/g9bon/project/graduation_project/AI-port-strategies`

- `docs/fixes/2026-07-17-reconstruction-fragmentation.md`: room4·room1 재현 수치, 엣지 손실 경로, 신규점 미융합, 수정 방향과 7월 20일 상태 갱신.
- `docs/superpowers/plans/2026-07-19-reconstruction-fragmentation-p1-p3.md`: 구현 계획 및 테스트 기대값. room4 실데이터 재현은 별도 검증 범위로 기재됨.
- `docs/edge_storage_flow.md`: 원본 3D, AI 2D, 수정본, 최종 3D의 정점/엣지 표현과 저장 흐름.

원문 진단의 관찰 수치는 인용하되 새로운 실험을 수행했다고 쓰지 않는다. 엣지 14개 이상·고립점 0개는 검증 목표이며 수정 후 측정 결과로 제시하지 않는다. 문서에 기록된 구현 상태와 현재 코드를 실행해 확인한 상태를 구분한다. 글의 게시일은 2026-10-12, 기록의 실험 시점은 2026년 7월이다.

## 후속 실험 글 후보

1. 2D 수정점을 3D로 반영하는 깊이 보존·삼각측량·평면 교차.
2. 바닥·천장 평탄화와 바닥 윤곽 확장.
3. VGGT와 MASt3R 전략의 실행 구조 비교.
4. AI/수정/최종 정점과 엣지의 데이터 계약.
5. AI 추론 요청의 비동기 처리와 결과 통지.

각 글은 문제 → 조건 → 가설 → 방법 → 관찰 → 한계 순으로 작성한다. 성능 비교와 개선 수치는 실행 로그·평가 자료가 확인된 범위에서만 작성한다. 이번 작업에서는 첫 글만 작성하고, 나머지 제목으로 빈 게시물을 만들지 않는다.
