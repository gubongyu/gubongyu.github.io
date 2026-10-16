# Terminal explorer

- `commands.ts`: 가상 경로, 자동완성, 명령 해석. DOM·스토리지 접근이 없는 순수 로직.
- `index.ts`: `mountTerminal(root)`로 DOM 이벤트와 effect를 연결하고 정리 함수를 반환한다.
- 필수 요소: `form`, `[data-terminal-input]`, `[data-terminal-output]`, `[data-terminal-preview]`, `[data-terminal-status]`, `[data-terminal-data]`.
- 입력 데이터: `TerminalContext`를 application/json script로 전달한다. `<`는 escape한다.
- 선택 요소: `[data-command]` 바로가기, `[data-cwd]` 경로 표시, `[data-terminal-exit]` 복귀 링크.
- 출력 클래스: `command-echo`, `dim`, `preview-tags`, `preview-link`. 스타일은 기능 root 내부에서 디자인이 정의한다.
- 새 명령은 `runCommand`에 분기를 추가하고 `commandNames`·도움말을 함께 갱신한다. 규모가 커지면 개별 command registry 파일로 분리한다.
- 명령 결과의 `effects`만 controller가 처리한다. 실제 셸 실행이나 임의 파일 접근은 없다.
- 명령 기록 100개·출력 노드 200개 상한으로 장시간 사용 시 메모리 증가를 제한한다.
