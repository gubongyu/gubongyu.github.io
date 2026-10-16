# Preferences

- `mountPreferences()`는 문서당 한 번 연결한다. 현재는 브라우저의 전체 페이지 탐색을 사용한다.
- `[data-theme-toggle]`, `[data-motion-toggle]`는 테마·움직임 제어다.
- 상태는 `html[data-theme]`, `html[data-motion]`. 저장 키는 `studio-theme`, `studio-motion`이다.
- OS 동작 줄이기는 사이트 설정보다 우선한다. localStorage 사용이 불가능해도 기본 화면은 렌더링된다.
- `studio:preferences`는 3D처럼 설정을 구독하는 영역에 보낸다.
- `[data-terminal-link]`는 현재 경로를 `from`에 전달한다. 복귀 주소는 배포 base 안에서만 허용한다.
- Cmd/Ctrl+K는 검색 페이지로 이동하거나 현재 검색 입력에 포커스한다.
- ClientRouter 도입 시 중복 mount 방지와 이벤트 구독 해제를 추가해야 한다.
