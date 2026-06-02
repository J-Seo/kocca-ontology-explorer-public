# 데이터 라이선스 (Data License)

본 프로젝트에 포함되거나 외부 저장소로부터 내려받는 국어 사전·규범 데이터는
**국립국어원**이 공개한 4개 언어자원을 가공·재배포한 것입니다.

원자료의 라이선스는 모두 **크리에이티브 커먼즈 저작자표시-동일조건변경허락 2.0 대한민국 (CC BY-SA 2.0 KR)** 입니다.

- 라이선스 전문: https://creativecommons.org/licenses/by-sa/2.0/kr/

## 원자료 출처

| 자원명 | 표제어/조항 수 | 출처 (제공기관) |
|---|---:|---|
| 표준국어대사전 (stdict) | 436,574 | 국립국어원 (https://stdict.korean.go.kr) |
| 우리말샘 (urimalsam) | 1,204,559 | 국립국어원 (https://opendict.korean.go.kr) |
| 한국어기초사전 (krdict) | 53,672 | 국립국어원 (https://krdict.korean.go.kr) |
| 한국어 어문 규범 (kornorms) | 110조항 + 380부록 + 80,115용례 | 국립국어원 (https://kornorms.korean.go.kr) |

## 재이용 시 의무 사항

본 프로젝트의 데이터(Tier A 인메모리 JSON, Tier B SQLite, Hugging Face Dataset 포함)를
이용·재배포하는 경우 CC BY-SA 2.0 KR에 따라 다음을 준수해야 합니다.

1. **저작자 표시 (Attribution)**
   - 위 출처(국립국어원 및 각 자원명·URL)를 명시
2. **동일조건 변경허락 (Share-Alike)**
   - 재가공물도 동일한 CC BY-SA 라이선스(또는 호환 라이선스)로 공개
3. **상업적 이용 가능**
   - 단, 위 두 조건을 충족하는 경우에 한함

## 가공 내역 고지

본 저장소가 원자료에 가한 주요 가공은 다음과 같습니다.

- 17개 의미 카테고리 분류 (vocabulary.json)
- 어문 규범 110조항 + 부록 변경 380건 구조화 (kornorms-articles.json, kornorms-appendix-history.json)
- 자원 간 관계 그래프(259 노드 / 263 엣지) 생성 (graph-relations.json)
- 표제어 검색을 위한 SQLite 인덱싱 (lexicon.sqlite)
- 외래어/로마자 용례 80,115건 정규화

## 면책

본 저장소는 비공식 가공물이며 국립국어원의 공식 입장이나 데이터 정합성을
보증하지 않습니다. 정확한 표준 데이터는 위 출처의 원자료를 참고하십시오.
