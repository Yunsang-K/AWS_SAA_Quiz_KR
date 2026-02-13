# AWS Certification Quiz App (Vue + Vite)

AWS SAA-C03 준비용 퀴즈 앱입니다.

## 실행

```bash
npm install
npm run dev
```

또는 Docker:

```bash
docker build -t aws-quiz-app .
docker run -p 5173:5173 aws-quiz-app
```

## 현재 기능
- 문제/선지/정답/해설 확인
- 이전/다음/번호 이동
- 오답 관리(틀린 문제만 보기)
- 로그인 ID별 학습 데이터 분리
- 정답률/최근 성과 기록

## DB 연동 (무료 배포용 권장: Supabase Free)

이 프로젝트는 **Supabase REST API**를 사용해 로그인 ID별 오답/정답률을 동기화할 수 있습니다.

### 1) Supabase 프로젝트 생성
- https://supabase.com 에서 Free 프로젝트 생성
- Project URL, anon key 확인

### 2) 테이블 생성 (SQL Editor)

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

alter table public.quiz_user_state enable row level security;

create policy "anon read quiz_user_state"
on public.quiz_user_state
for select
using (true);

create policy "anon upsert quiz_user_state"
on public.quiz_user_state
for insert
with check (true);

create policy "anon update quiz_user_state"
on public.quiz_user_state
for update
using (true)
with check (true);
```

> 위 정책은 데모/학습용 최소 설정입니다. 실제 서비스는 인증 기반 RLS 정책으로 강화하세요.

### 3) 환경변수 설정
프로젝트 루트에 `.env` 파일 생성:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

설정하지 않으면 앱은 자동으로 localStorage 모드로 동작합니다.

## 무료 배포 추천
- 프런트: Vercel / Netlify / Cloudflare Pages (무료)
- DB: Supabase Free

