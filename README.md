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
- `awsQuiz:session` (세션 만료 시간 포함)

### 선택 저장소 (Supabase REST)

### 세션 관리
- 기본 세션 TTL은 120분이며, `VITE_SESSION_TTL_MINUTES`로 변경할 수 있습니다.
- 사용자 활동(문제 풀이/이동/설정 저장)마다 세션 만료 시간이 연장됩니다.
- 만료 시 자동 로그아웃 후 다시 로그인해야 합니다.

환경변수가 설정되면 `quiz_user_state` 테이블과 동기화합니다.

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

미설정 시 로컬 저장 모드로 동작합니다.


### 동기화 동작 원리
- 로그인 성공 시 `syncFromDb()`가 먼저 실행되어 `quiz_user_state`를 조회합니다.
- 해당 `user_id` 행이 없으면 빈 통계 상태로 `syncToDb()`를 호출해 초기 행을 생성합니다.
- 문제 채점(`submitAnswer`)·모의고사 종료·설정 변경 시 `syncToDb()`가 실행되어 upsert 됩니다.

### Supabase RLS 설정 예시 (anon key 사용 시 필수)
`members` 같은 별도 테이블이 없다면, 템플릿의 join 정책 대신 아래처럼 단순 정책을 사용하세요.
또한 이 앱은 Supabase Auth 로그인(`auth.uid()`)을 사용하지 않으므로, **"Users can insert/read/update own state" 템플릿(own state 정책)은 동작하지 않을 수 있습니다.**

```sql
alter table public.quiz_user_state enable row level security;

create policy "quiz_user_state_select_all"
on public.quiz_user_state
for select
to anon
using (true);

create policy "quiz_user_state_insert_all"
on public.quiz_user_state
for insert
to anon
with check (true);

create policy "quiz_user_state_update_all"
on public.quiz_user_state
for update
to anon
using (true)
with check (true);
```

> 운영 환경에서는 `to authenticated` + `auth.uid()` 기반으로 좁혀야 안전합니다.

### 정책 점검 쿼리
```sql
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'quiz_user_state'
order by policyname;
```

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
