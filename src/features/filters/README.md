# List filters

- 진입점: `mountFilters(root)` → 정리 함수.
- 항목: `[data-filter-item]`, `data-search-text`, JSON 배열인 `data-tags`.
- 선택 제어: `[data-filter-input]`, `[data-filter-tag]`, `[data-filter-reset]`.
- 상태: `[data-filter-status]`, `[data-filter-empty]`. 제어에는 `[data-enhanced-filter] hidden`을 두어 JavaScript 초기화 후 표시한다.
- query string의 `q`, `tag`로 상태를 복원한다. 필터 선택은 history에 추가하고 검색 입력은 현재 항목을 갱신한다.
- 공개 여부는 여기서 결정하지 않는다. 빌드가 전달한 공개 항목만 다룬다.
- `matchesFilter`는 DOM 없이 검증할 수 있는 순수 함수다. 화면 스타일은 디자인의 책임이다.
