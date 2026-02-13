# AWS SAA Quiz KR (Vue + Vite)

AWS SAA-C03 대비를 위한 한국어 퀴즈 웹앱입니다. 문제 풀이, 오답 복습, 모의고사, 학습 통계를 한 화면에서 제공합니다.

## 빠른 시작

```bash
npm install
npm run dev
```

- 개발 서버: `http://localhost:5173`

### 빌드

```bash
npm run build
npm run preview
```

### Docker 실행

```bash
docker build -t aws-quiz-app .
docker run -p 5173:5173 aws-quiz-app
```

## 현재 구현 기능

- 로그인(ID yun ,PassWord yunsang123)
- 문제 풀이(복수정답 자동 채점)
- 해설 보기
- 이전/다음/번호 이동
- 오답 노트 + `틀린 문제만 보기`
- **오답만 보기 모드에서 오답을 모두 해결하면 자동으로 전체 문제 모드로 복귀**
- 오답 정책
  - `keep_history`: 틀린 이력을 유지
  - `remove_on_correct`: 맞히면 오답에서 제거
- 모의고사(랜덤 N문항)
- 학습 통계
  - 누적 정답률
  - 최근 20문항 정답률
  - 최근 모의고사 이력

## 데이터 저장 구조

### 기본 저장소
- `localStorage` 사용자 분리 키 사용
  - `awsQuiz:{user}:wrongAnswers`
  - `awsQuiz:{user}:stats`
  - `awsQuiz:{user}:settings`
  - `awsQuiz:{user}:currentIndex`

### 선택 저장소 (Supabase REST)
환경변수가 설정되면 `quiz_user_state` 테이블과 동기화합니다.

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

미설정 시 로컬 저장 모드로 동작합니다.

## Supabase 테이블 예시

```sql
create table if not exists public.quiz_user_state (
  user_id text primary key,
  wrong_answers jsonb not null default '[]'::jsonb,
  total_answered int not null default 0,
  total_correct int not null default 0,
  recent_results jsonb not null default '[]'::jsonb,
  mock_exam_history jsonb not null default '[]'::jsonb,
  wrong_policy text not null default 'keep_history',
  updated_at timestamptz not null default now()
);
```

> 데모용 최소 정책 기준입니다. 운영 시 인증 기반 RLS 정책을 권장합니다.
