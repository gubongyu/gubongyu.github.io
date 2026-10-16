# Search controller

- 진입점: `mountSearch(root)` → 정리 함수.
- 필수 요소: `form`, `[data-search-input]`, `[data-search-results]`, `[data-search-status]`, `[data-search-index]`.
- `[data-search-index]`는 `PublicIndexItem[]`을 담은 application/json script다. HTML에 넣을 때 `<`를 escape한다.
- 선택 요소: `[data-search-suggestion]` 버튼의 속성값이 검색어다.
- 선택 요소: `template[data-search-arrow]`의 내용이 각 결과의 장식용 화살표로 복제된다. 없으면 `↗` 글리프를 쓴다.
- 검색 결과 계약은 `adapter.ts`의 `SearchResult`. 검색 엔진을 바꿀 때 adapter만 교체한다.
- 입력은 URL `q`와 동기화된다. 늦게 도착한 이전 응답은 무시한다.
- 결과 마크업은 `h2`, `p`, 링크와 장식용 화살표를 사용한다. 스타일은 디자인 뷰에서 `[data-search-results]` 아래로 제한한다.
- 상태는 `aria-live=polite`로 알린다. Pagefind 실패 시 공개 메타데이터 검색으로 전환하고 범위를 표시한다.
