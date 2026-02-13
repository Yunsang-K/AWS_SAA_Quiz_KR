# AWS SAA Quiz KR 기능 명세 (현행 기준)

## 1) 개요
- 목적: AWS SAA-C03 학습을 위한 문제 풀이 + 오답 복습 + 통계 확인
- 형태: Vue 3(Options API) + Vite SPA
- 핵심 데이터 소스: `src/questions.json`

## 2) 화면/흐름

### 2.1 로그인
- 로그인 화면에서 ID/비밀번호 입력 후 진입
- 현재 구현된 유효 계정: `yun / yunsang123`
- 로그인 성공 시 사용자별 저장 키를 로드하고, 조건에 따라 DB(Supabase) 상태를 동기화

### 2.2 문제 풀이
- 문제/선지/정답/해설 표시
- 정답 개수만큼 선택되면 자동 채점
- 채점 후 정답/오답 스타일 표시 및 해설 열람 가능
- 이전/다음/번호 이동 제공

### 2.3 오답 노트
- 오답 문제 ID 목록 표시
- `틀린 문제만 보기` 토글 시 오답 ID 기반으로 문제 세트를 재구성
- 오답 정책
  - `keep_history`: 틀린 이력을 유지
  - `remove_on_correct`: 정답 시 오답 제거
- **개선 반영:** 오답만 보기 모드에서 재풀이로 오답이 0개가 되면 자동으로 전체 문제 보기로 복귀

### 2.4 모의고사
- 사용자가 입력한 N문항을 랜덤(중복 없음)으로 출제
- 모의고사 종료 시 점수/정답률을 기록하고 최근 이력에 저장

### 2.5 학습 통계
- 누적 풀이 수/정답 수/정답률
- 최근 20문항 정답률
- 최근 모의고사 이력(최대 20건)

## 3) 상태 모델

### 3.1 핵심 상태(`App.vue`)
- `fullQuestions`: 전체 문제 원본
- `questions`: 현재 표시 문제 집합(전체/오답/모의고사)
- `current`: 현재 인덱스
- `wrongAnswers`: 오답 ID 목록
- `viewWrongOnly`: 오답만 보기 모드
- `wrongPolicy`: 오답 처리 정책
- `stats`: 누적/최근 결과/모의고사 이력
- `isMockMode`, `mockQuestionIds`, `mockAnswered`, `mockCorrect`, `lastMockResult`

### 3.2 사용자 저장 키(localStorage)
- `awsQuiz:{user}:wrongAnswers`
- `awsQuiz:{user}:stats`
- `awsQuiz:{user}:settings`
- `awsQuiz:{user}:currentIndex`

## 4) 정답 제출 로직

1. 선택값과 정답값을 정렬 문자열로 비교해 정오답 판정
2. 통계(`totalAnswered`, `totalCorrect`, `recentResults`) 갱신
3. 모의고사 모드면 모의고사 카운터도 갱신
4. 오답 정책에 따라 `wrongAnswers` 추가/제거
5. **오답만 보기 + 오답 0개 상태면 자동 복귀 처리**
   - `viewWrongOnly = false`
   - 문제 집합을 전체(`fullQuestions`)로 재적용
   - 현재 문제를 전체 문제 인덱스로 복원
6. 로컬 저장 및 필요 시 Supabase 동기화

## 5) DB 연동(Supabase REST, 선택)
- 활성 조건: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 모두 존재
- 테이블: `quiz_user_state`
- 동기화 항목
  - `wrong_answers`
  - `total_answered`
  - `total_correct`
  - `recent_results`
  - `wrong_policy`
  - `mock_exam_history`

## 6) 비기능/제약
- 기본 인증은 데모용 하드코딩 계정 기반
- 서버 API 없이 동작 가능(localStorage only)
- 대용량 문제 JSON 단일 파일 관리 구조

## 7) 실행

```bash
npm install
npm run dev
```

```bash
npm run build
```
