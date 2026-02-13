<template>
  <div class="app-shell">
    <header class="top-header" v-if="isLoggedIn">
      <div>
        <p class="eyebrow">AWS SAA-C03</p>
        <h2 class="top-title"><strong>{{ currentUser }}</strong> 님의 학습 대시보드</h2>
      </div>
      <button class="btn btn-secondary" @click="handleLogout">로그아웃</button>
    </header>

    <LoginForm
      v-if="!isLoggedIn"
      v-model:login-id="loginId"
      v-model:password="password"
      :show-password="showPassword"
      :login-error="loginError"
      :is-login-disabled="isLoginDisabled"
      @toggle-password="showPassword = !showPassword"
      @submit="handleLogin"
    />

    <QuizLayout
      v-else
      :questions="questions"
      :current="current"
      :question="question"
      :wrong-answers="wrongAnswers"
      :view-wrong-only="viewWrongOnly"
      :stats="stats"
      :mock-size-input="mockSizeInput"
      :full-length="fullQuestionCount"
      :is-mock-mode="isMockMode"
      :last-mock-result="lastMockResult"
      :safe-progress-max="safeProgressMax"
      :safe-progress-value="safeProgressValue"
      :show-answer="showAnswer"
      :show-explanation="showExplanation"
      :jump-number="jumpNumber"
      :button-class="buttonClass"
      :accuracy-rate="accuracyRate"
      :recent-accuracy-rate="recentAccuracyRate"
      :recent-window-size="RECENT_WINDOW_SIZE"
      :wrong-policy="wrongPolicy"
      :db-enabled="dbEnabled"
      :db-status="dbStatus"
      @update:mock-size="mockSizeInput = $event"
      @start-mock="startMockExam"
      @finish-mock="finishMockExam"
      @toggle-wrong-only="toggleWrongOnly"
      @toggle-choice="toggleChoice"
      @show-explanation="showExplanation = true"
      @prev-question="prevQuestion"
      @next-question="nextQuestion"
      @update:jump-number="jumpNumber = $event"
      @jump-to="jumpTo"
      @update:wrong-policy="updateWrongPolicy"
    />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import LoginForm from './components/LoginForm.vue'
import QuizLayout from './components/QuizLayout.vue'
import { useAuth } from './composables/useAuth'
import { useQuiz } from './composables/useQuiz'

const {
  loginId,
  password,
  showPassword,
  loginError,
  currentUser,
  isLoggedIn,
  isLoginDisabled,
  initializeFromStorage,
  login,
  logout
} = useAuth()

const {
  RECENT_WINDOW_SIZE,
  questions,
  fullQuestionCount,
  current,
  question,
  showAnswer,
  showExplanation,
  wrongAnswers,
  viewWrongOnly,
  jumpNumber,
  dbEnabled,
  dbStatus,
  wrongPolicy,
  stats,
  isMockMode,
  mockSizeInput,
  lastMockResult,
  safeProgressMax,
  safeProgressValue,
  accuracyRate,
  recentAccuracyRate,
  persistUserData,
  startMockExam,
  finishMockExam,
  toggleWrongOnly,
  toggleChoice,
  buttonClass,
  prevQuestion,
  nextQuestion,
  jumpTo,
  onUserLogin,
  onUserLogout
} = useQuiz(currentUser)

const handleLogin = async () => {
  const ok = login()
  if (ok) await onUserLogin()
}

const handleLogout = () => {
  logout()
  onUserLogout()
}

const updateWrongPolicy = value => {
  wrongPolicy.value = value
  persistUserData()
}

onMounted(async () => {
  initializeFromStorage()
  if (isLoggedIn.value) await onUserLogin()
})
</script>

<style>
:root {
  color-scheme: light;
  --bg: #f8fafc;
  --ink: #0f172a;
  --muted: #64748b;
  --line: #e2e8f0;
  --card: #ffffff;
  --primary: #1d4ed8;
  --primary-strong: #1d4ed8;
  --danger: #e11d48;
}

* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: 'Pretendard', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: var(--ink);
  background: #f8fafc;
}

.app-shell {
  position: relative;
  max-width: 1220px;
  margin: 0 auto;
  padding: 1.1rem 1rem 2rem;
}
.top-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding: 1rem 1.1rem;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #fff;
}
.top-title { margin: 0; font-size: 1.15rem; }
.eyebrow { margin: 0 0 0.15rem; color: var(--muted); font-size: 0.78rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }

.content-layout { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 1rem; }
.main-area, .left-sidebar { min-width: 0; display: flex; flex-direction: column; gap: 1rem; }
.card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 1rem;
  box-shadow: 0 8px 24px #0f172a0a;
}
.panel-card { padding: 0.95rem; }
.question-card { padding: 1.1rem; }

.panel-head { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.65rem; }
.panel-head h3 { margin: 0; font-size: 1rem; }
.chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  font-size: 0.72rem;
  background: #dbeafe;
  color: #1d4ed8;
  padding: 0.2rem 0.55rem;
  font-weight: 700;
}
.chip-soft { background: #eef2ff; color: #4f46e5; }

.progress-head { display: grid; gap: 0.55rem; margin-bottom: 0.85rem; }
.question-text { margin: 0 0 0.9rem; font-size: 1.06rem; line-height: 1.55; font-weight: 600; }
.choice-row { margin-bottom: 0.52rem; }
.choice-key {
  width: 26px;
  height: 26px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  background: #e2e8f0;
  color: #0f172a;
}
.answer-box, .explain-box, .empty-box, .metric-box {
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 0.7rem 0.8rem;
  background: #f8fbff;
}
.explain-box p { margin: 0.2rem 0; }
.metric-title { margin: 0; font-size: 0.82rem; color: var(--muted); font-weight: 600; }
.metric-value { margin: 0.25rem 0 0; font-size: 1rem; font-weight: 700; }
.wrong-list { margin: 0.25rem 0 0; line-height: 1.45; }

.field-stack { margin-top: 0.85rem; }
.field-label { display: block; margin-bottom: 0.42rem; font-size: 0.86rem; font-weight: 700; color: #334155; }
.input {
  width: 100%;
  padding: 0.66rem 0.75rem;
  border: 1px solid #cfdced;
  border-radius: 12px;
  background: #fff;
  font-size: 0.93rem;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.input:focus {
  outline: none;
  border-color: #60a5fa;
  box-shadow: 0 0 0 3px #bfdbfe;
}
.input-with-action { display: grid; grid-template-columns: 1fr auto; gap: 0.45rem; }
.inline-row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }

.btn {
  border: 1px solid transparent;
  border-radius: 12px;
  padding: 0.6rem 0.85rem;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn:disabled { opacity: 0.45; cursor: not-allowed; }
.btn-primary { background: var(--primary); color: #fff; }
.btn-primary:hover:not(:disabled) { background: var(--primary-strong); }
.btn-secondary { background: #f8fafc; color: #334155; border-color: #cfdced; }
.btn-secondary:hover:not(:disabled) { background: #f1f5f9; }
.btn-danger { background: var(--danger); color: #fff; }
.btn-danger:hover:not(:disabled) { background: #be123c; }
.btn-ghost { background: #fff; color: #334155; border-color: #cfdced; }
.btn-choice {
  width: 100%;
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 0.65rem;
  text-align: left;
  background: #fff;
  border-color: #d5e2f2;
}
.btn-choice:hover:not(:disabled) { border-color: #93c5fd; background: #f8fbff; }
.btn-choice.selected { border: 2px solid #3b82f6; background: #eff6ff; }
.btn-choice.correct { border: 2px solid #16a34a; background: #f0fdf4; }
.btn-choice.incorrect { border: 2px solid #ef4444; background: #fef2f2; }

.auth-shell { display: grid; place-items: center; min-height: 75vh; }
.auth-card { width: min(94vw, 520px); padding: 1.25rem; }
.auth-title { margin: 0.2rem 0 0.35rem; font-size: 1.5rem; }
.auth-subtitle { margin: 0; color: var(--muted); line-height: 1.45; }
.auth-submit { width: 100%; margin-top: 0.75rem; }
.status-error {
  margin: 0.65rem 0 0;
  padding: 0.6rem 0.7rem;
  border-radius: 10px;
  background: #fff1f2;
  border: 1px solid #fecdd3;
  color: #be123c;
  font-size: 0.88rem;
}
.helper-text { margin: 0; color: var(--muted); font-size: 0.82rem; }
.muted-inline { color: var(--muted); font-weight: 500; font-size: 0.86rem; }
.history-list { margin: 0.45rem 0 0; padding-left: 1rem; color: #334155; }
.history-list li { margin-bottom: 0.3rem; font-size: 0.87rem; }
.recent-strip { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.42rem; }
.dot { width: 10px; height: 10px; border-radius: 999px; display: inline-block; }
.dot-correct { background: #22c55e; }
.dot-incorrect { background: #f43f5e; }
.mt { margin-top: 0.9rem; }
.mt-sm { margin-top: 0.45rem; }
.mt-lg { margin-top: 1rem; }

@media (max-width: 980px) {
  .content-layout { grid-template-columns: 1fr; }
  .mobile-primary { order: -1; }
}
@media (max-width: 640px) {
  .top-header { align-items: flex-start; flex-direction: column; gap: 0.75rem; }
  .app-shell { padding: 0.75rem 0.7rem 1.5rem; }
}
</style>
