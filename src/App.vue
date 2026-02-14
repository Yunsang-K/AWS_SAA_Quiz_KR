<template>
  <div class="app-shell">
    <header class="top-header card" v-if="isLoggedIn">
      <div>
        <p class="eyebrow">AWS SAA-C03</p>
        <h2 class="dashboard-title">{{ currentUser }} 님의 학습 대시보드</h2>
      </div>
      <button class="logout-button" @click="logout">로그아웃</button>
    </header>

    <div v-if="!isLoggedIn" class="login-panel">
      <p class="eyebrow">AWS SAA QUIZ</p>
      <h3 class="login-title">학습을 다시 시작해볼까요?</h3>
      <p class="muted login-copy">로그인 후 오답, 정답률, 마지막 위치를 자동으로 복원합니다.</p>

      <form class="login-form" @submit.prevent="login">
        <label class="login-label" for="login-id">로그인 ID</label>
        <input
          id="login-id"
          v-model.trim="loginId"
          class="login-input"
          placeholder="예: saa-lee"
          autocomplete="username"
        />

        <label class="login-label" for="login-password">비밀번호</label>
        <div class="row">
          <input
            id="login-password"
            v-model="loginPassword"
            class="login-input"
            :type="showPassword ? 'text' : 'password'"
            placeholder="비밀번호 입력"
            autocomplete="current-password"
          />
          <button type="button" class="toggle-password" @click="showPassword = !showPassword">
            {{ showPassword ? '숨김' : '표시' }}
          </button>
        </div>

        <button type="submit" class="login-button" :disabled="!loginId || !loginPassword">Enter로 시작</button>
      </form>

      <p v-if="loginError" class="error-message">{{ loginError }}</p>
      <p class="muted login-help">기본 비밀번호는 <strong>quiz1234</strong> 입니다. (VITE_APP_LOGIN_PASSWORD로 변경 가능)</p>
    </div>

    <div v-else class="content-layout">
      <main class="main-area">
        <section class="card question-card">
          <div class="progress-chip">Question {{ safeProgressValue }}/{{ safeProgressMax }}</div>
          <progress :value="safeProgressValue" :max="safeProgressMax"></progress>

          <div v-if="question" class="question-area">
            <p class="question-copy">{{ question.question }}</p>
            <div v-for="(text, key) in question.choices" :key="key">
              <button :class="['choice-button', buttonClass(key)]" @click="toggleChoice(key)">
              {{ key }}. {{ text }}
            </button>
            </div>

            <div v-if="showAnswer">
              <p><strong>정답:</strong> {{ question.answers.join(', ') }}</p>
              <button class="secondary-button" @click="showExplanation = true">해설 보기</button>
            </div>

            <div v-if="showExplanation" class="mt">
              <p v-for="(exp, i) in question.explanations" :key="i">• {{ exp }}</p>
            </div>

            <div class="stack-buttons mt">
              <button class="secondary-button" @click="prevQuestion" :disabled="current === 0">이전 문제</button>
              <button class="secondary-button" @click="nextQuestion" :disabled="current + 1 >= questions.length">다음 문제</button>
            </div>
          </div>

          <div v-else class="card mt-lg">
            <p>표시할 문제가 없습니다.</p>
          </div>
        </section>

        <section class="card mt-lg">
          <h3>문제 번호 이동</h3>
          <div class="stack-buttons">
            <input type="number" v-model.number="jumpNumber" placeholder="번호 입력" min="1" :max="questions.length || 1" />
            <button class="primary-button" @click="jumpTo">이동</button>
          </div>
        </section>
      </main>

      <aside class="right-sidebar">
        <section class="card">
          <div class="section-head">
            <h3>오답 노트</h3>
            <span class="badge">{{ wrongAnswers.length }}개</span>
          </div>
          <p>{{ wrongAnswers.join(', ') || '아직 없습니다 🎉' }}</p>
          <button v-if="wrongAnswers.length" class="secondary-button" @click="toggleWrongOnly">
            {{ viewWrongOnly ? '전체 문제 보기' : '틀린 문제만 보기' }}
          </button>
        </section>

        <section class="card">
          <div class="section-head">
            <h3>모의고사</h3>
            <span class="badge">랜덤</span>
          </div>
          <div class="stack-buttons">
            <input
              type="number"
              min="1"
              :max="fullQuestions.length"
              v-model.number="mockSizeInput"
              placeholder="문항 수"
            />
            <button class="primary-button" @click="startMockExam">시작</button>
          </div>
          <button v-if="isMockMode" class="secondary-button mt" @click="finishMockExam">모의고사 종료</button>
          <p v-if="isMockMode" class="muted">진행: {{ current + 1 }} / {{ questions.length }}</p>

          <div v-if="lastMockResult" class="result-box">
            <p><strong>최근 모의고사</strong></p>
            <p>{{ lastMockResult.correct }} / {{ lastMockResult.size }} ({{ lastMockResult.accuracy }}%)</p>
          </div>
        </section>

        <section class="card">
          <div class="section-head">
            <h3>학습 통계</h3>
            <span class="badge">LIVE</span>
          </div>
          <p><strong>누적 정답률</strong></p>
          <p class="stats-main">{{ accuracyRate }}% <span class="muted">({{ stats.totalCorrect }}/{{ stats.totalAnswered }})</span></p>
          <progress :value="Number(accuracyRate)" max="100"></progress>

          <p class="mt"><strong>최근 {{ recentWindowSize }}문제 정답률:</strong> {{ recentAccuracyRate }}%</p>
          <div class="recent-strip">
            <span
              v-for="(result, idx) in stats.recentResults"
              :key="idx"
              :class="['dot', result ? 'dot-correct' : 'dot-incorrect']"
            ></span>
          </div>

          <label>
            오답 정책:
            <select v-model="wrongPolicy" @change="persistUserData">
              <option value="keep_history">틀리면 계속 유지</option>
              <option value="remove_on_correct">정답 시 오답 제거</option>
            </select>
          </label>
          <p class="muted">DB 상태: {{ dbStatus }}</p>

          <div class="mt" v-if="stats.mockExamHistory.length">
            <p><strong>최근 모의고사 이력</strong></p>
            <ul>
              <li v-for="(exam, i) in stats.mockExamHistory.slice(0, 5)" :key="i">
                {{ exam.date }} - {{ exam.correct }}/{{ exam.size }} ({{ exam.accuracy }}%)
              </li>
            </ul>
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>

<script>
import questions from './questions.json'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const RECENT_WINDOW_SIZE = 20
const SESSION_TTL_MINUTES = Number(import.meta.env.VITE_SESSION_TTL_MINUTES || 120)
const SESSION_TTL_MS = SESSION_TTL_MINUTES * 60 * 1000

export default {
  data() {
    return {
      fullQuestions: questions,
      questions,
      current: 0,
      selectedChoices: [],
      showAnswer: false,
      showExplanation: false,
      wrongAnswers: [],
      viewWrongOnly: false,
      jumpNumber: null,
      loginId: '',
      loginPassword: '',
      loginError: '',
      currentUser: '',
      isLoggedIn: false,
      dbEnabled: Boolean(SUPABASE_URL && SUPABASE_ANON_KEY),
      dbStatus: '대기',
      wrongPolicy: 'keep_history',
      stats: {
        totalAnswered: 0,
        totalCorrect: 0,
        recentResults: [],
        mockExamHistory: []
      },
      recentWindowSize: RECENT_WINDOW_SIZE,
      isMockMode: false,
      mockSizeInput: 20,
      mockQuestionIds: [],
      mockAnswered: 0,
      mockCorrect: 0,
      lastMockResult: null,
      showPassword: false,
      sessionTimeoutId: null,
      sessionExpiresAt: null
    }
  },
  computed: {
    question() {
      return this.questions[this.current]
    },
    accuracyRate() {
      if (!this.stats.totalAnswered) return '0.0'
      return ((this.stats.totalCorrect / this.stats.totalAnswered) * 100).toFixed(1)
    },
    recentAccuracyRate() {
      if (!this.stats.recentResults.length) return '0.0'
      const correctCount = this.stats.recentResults.filter(Boolean).length
      return ((correctCount / this.stats.recentResults.length) * 100).toFixed(1)
    },
    safeProgressMax() {
      return this.questions.length || 1
    },
    safeProgressValue() {
      if (!this.questions.length) return 0
      return this.current + 1
    }
  },
  methods: {
    normalizeStats(payload) {
      return {
        totalAnswered: payload.totalAnswered || 0,
        totalCorrect: payload.totalCorrect || 0,
        recentResults: payload.recentResults || [],
        mockExamHistory: payload.mockExamHistory || []
      }
    },
    getSessionKey() {
      return 'awsQuiz:session'
    },
    createSession(userId) {
      const expiresAt = Date.now() + SESSION_TTL_MS
      const payload = { userId, expiresAt }
      localStorage.setItem(this.getSessionKey(), JSON.stringify(payload))
      this.sessionExpiresAt = expiresAt
      this.scheduleSessionTimeout()
    },
    clearSessionData() {
      localStorage.removeItem(this.getSessionKey())
      this.sessionExpiresAt = null
      if (this.sessionTimeoutId) {
        clearTimeout(this.sessionTimeoutId)
        this.sessionTimeoutId = null
      }
    },
    restoreSession() {
      const raw = localStorage.getItem(this.getSessionKey())
      if (!raw) return
      try {
        const payload = JSON.parse(raw)
        if (!payload.userId || !payload.expiresAt || payload.expiresAt <= Date.now()) {
          this.clearSessionData()
          return
        }
        if (!this.dbEnabled) {
          this.clearSessionData()
          this.dbStatus = 'DB 설정 오류: Supabase 환경변수가 필요합니다.'
          return
        }
        this.currentUser = payload.userId
        this.loginId = payload.userId
        this.isLoggedIn = true
        this.sessionExpiresAt = payload.expiresAt
        this.applyQuestionSetFromState()
        this.current = 0
        this.scheduleSessionTimeout()
        this.syncFromDb()
      } catch {
        this.clearSessionData()
      }
    },
    touchSession() {
      if (!this.isLoggedIn || !this.currentUser) return
      this.createSession(this.currentUser)
    },
    scheduleSessionTimeout() {
      if (this.sessionTimeoutId) clearTimeout(this.sessionTimeoutId)
      if (!this.sessionExpiresAt) return
      const remaining = this.sessionExpiresAt - Date.now()
      if (remaining <= 0) {
        this.logout(true)
        return
      }
      this.sessionTimeoutId = setTimeout(() => {
        this.logout(true)
      }, remaining)
    },
    login() {
      if (!this.loginId || !this.loginPassword) return
      if (!this.dbEnabled) {
        this.loginError = 'DB 설정이 필요합니다. Supabase 환경변수를 확인해주세요.'
        return
      }
      if (!(this.loginId === 'yun' && this.loginPassword === 'yunsang123')) {
        this.loginError = '아이디 또는 비밀번호가 올바르지 않습니다.'
        this.isLoggedIn = false
        this.currentUser = ''
        return
      }
      this.loginError = ''
      this.currentUser = this.loginId
      this.isLoggedIn = true
      this.createSession(this.currentUser)
      this.applyQuestionSetFromState()
      this.current = 0
      this.syncFromDb()
    },
    logout(isAutoExpired = false) {
      this.isLoggedIn = false
      this.currentUser = ''
      this.loginId = ''
      this.loginPassword = ''
      this.loginError = isAutoExpired ? '세션이 만료되어 자동 로그아웃되었습니다. 다시 로그인해주세요.' : ''
      this.clearSessionData()
      this.questions = this.fullQuestions
      this.current = 0
      this.resetSession()
    },
    persistUserData() {
      if (!this.currentUser) return
      this.touchSession()
      this.syncToDb()
    },
    applyQuestionSetFromState() {
      if (this.isMockMode && this.mockQuestionIds.length) {
        const set = new Set(this.mockQuestionIds)
        this.questions = this.fullQuestions.filter(q => set.has(q.id))
        return
      }
      this.questions = this.viewWrongOnly
        ? this.fullQuestions.filter(q => this.wrongAnswers.includes(q.id))
        : this.fullQuestions
    },
    async syncFromDb() {
      if (!this.dbEnabled || !this.currentUser) return
      try {
        this.dbStatus = '불러오는 중...'
        const url = `${SUPABASE_URL}/rest/v1/quiz_user_state?user_id=eq.${encodeURIComponent(this.currentUser)}&select=user_id,wrong_answers,total_answered,total_correct,recent_results,wrong_policy,mock_exam_history`
        const res = await fetch(url, {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`
          }
        })
        if (!res.ok) throw new Error(await this.extractDbError(res, 'DB 조회 실패'))
        const rows = await res.json()
        if (rows.length) {
          const row = rows[0]
          this.wrongAnswers = row.wrong_answers || []
          this.stats = this.normalizeStats({
            totalAnswered: row.total_answered,
            totalCorrect: row.total_correct,
            recentResults: row.recent_results,
            mockExamHistory: row.mock_exam_history
          })
          this.wrongPolicy = row.wrong_policy || 'keep_history'
          this.applyQuestionSetFromState()
          this.current = 0
        } else {
          await this.syncToDb()
        }
        this.dbStatus = '불러오기 완료'
      } catch (error) {
        this.dbStatus = `불러오기 실패: ${error.message}`
      }
    },
    async extractDbError(response, fallback) {
      try {
        const data = await response.json()
        const detail = [data?.message, data?.details, data?.hint].filter(Boolean).join(' / ')
        if (detail) return `${fallback} - ${detail}`
      } catch {
        // json 파싱 실패 시 fallback 사용
      }
      return `${fallback} - HTTP ${response.status}`
    },
    async syncToDb() {
      if (!this.dbEnabled || !this.currentUser) return
      try {
        this.dbStatus = '저장 중...'
        const payload = {
          user_id: this.currentUser,
          wrong_answers: this.wrongAnswers,
          total_answered: this.stats.totalAnswered,
          total_correct: this.stats.totalCorrect,
          recent_results: this.stats.recentResults,
          wrong_policy: this.wrongPolicy,
          mock_exam_history: this.stats.mockExamHistory
        }
        const res = await fetch(`${SUPABASE_URL}/rest/v1/quiz_user_state?on_conflict=user_id&select=user_id`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            Prefer: 'resolution=merge-duplicates,return=representation'
          },
          body: JSON.stringify(payload)
        })
        if (!res.ok) throw new Error(await this.extractDbError(res, 'DB 저장 실패'))

        const rows = await res.json()
        if (!Array.isArray(rows) || rows.length === 0) {
          throw new Error('DB 저장 실패 - upsert 결과가 비어 있습니다. RLS WITH CHECK 정책을 확인하세요.')
        }
        this.dbStatus = '저장 완료'
      } catch (error) {
        this.dbStatus = `저장 실패: ${error.message}`
      }
    },
    startMockExam() {
      const n = Number(this.mockSizeInput)
      if (!n || n < 1 || n > this.fullQuestions.length) {
        alert('유효한 문항 수를 입력하세요.')
        return
      }
      const pool = [...this.fullQuestions]
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[pool[i], pool[j]] = [pool[j], pool[i]]
      }
      const selected = pool.slice(0, n)
      this.mockQuestionIds = selected.map(q => q.id)
      this.questions = selected
      this.isMockMode = true
      this.viewWrongOnly = false
      this.mockAnswered = 0
      this.mockCorrect = 0
      this.current = 0
      this.resetSession()
      this.persistUserData()
    },
    finishMockExam() {
      if (this.isMockMode) {
        const size = this.questions.length
        const accuracy = this.mockAnswered ? ((this.mockCorrect / this.mockAnswered) * 100).toFixed(1) : '0.0'
        this.lastMockResult = {
          date: new Date().toLocaleString('ko-KR'),
          size,
          correct: this.mockCorrect,
          answered: this.mockAnswered,
          accuracy
        }
        this.stats.mockExamHistory.unshift(this.lastMockResult)
        this.stats.mockExamHistory = this.stats.mockExamHistory.slice(0, 20)
      }

      this.isMockMode = false
      this.mockQuestionIds = []
      this.mockAnswered = 0
      this.mockCorrect = 0
      this.applyQuestionSetFromState()
      this.current = 0
      this.resetSession()
      this.persistUserData()
    },
    toggleWrongOnly() {
      this.viewWrongOnly = !this.viewWrongOnly
      this.isMockMode = false
      this.mockQuestionIds = []
      this.mockAnswered = 0
      this.mockCorrect = 0
      this.applyQuestionSetFromState()
      this.current = 0
      this.resetSession()
      this.persistUserData()
    },
    toggleChoice(choice) {
      if (this.showAnswer || !this.question) return
      const correctCount = this.question.answers.length
      if (this.selectedChoices.includes(choice)) {
        this.selectedChoices = this.selectedChoices.filter(c => c !== choice)
      } else {
        if (this.selectedChoices.length >= correctCount) return
        this.selectedChoices.push(choice)
      }
      if (this.selectedChoices.length === correctCount) this.submitAnswer()
    },
    submitAnswer() {
      this.showAnswer = true
      const selectedSorted = [...this.selectedChoices].sort().join(',')
      const correctSorted = [...this.question.answers].sort().join(',')
      const isCorrect = selectedSorted === correctSorted
      const questionId = this.question.id

      this.stats.totalAnswered += 1
      if (isCorrect) this.stats.totalCorrect += 1
      this.stats.recentResults.push(isCorrect)
      if (this.stats.recentResults.length > RECENT_WINDOW_SIZE) this.stats.recentResults.shift()

      if (this.isMockMode) {
        this.mockAnswered += 1
        if (isCorrect) this.mockCorrect += 1
      }

      if (!isCorrect) {
        if (!this.wrongAnswers.includes(questionId)) this.wrongAnswers.push(questionId)
      } else if (this.wrongPolicy === 'remove_on_correct') {
        this.wrongAnswers = this.wrongAnswers.filter(id => id !== questionId)
      }

      if (this.viewWrongOnly && !this.isMockMode && this.wrongAnswers.length === 0) {
        this.viewWrongOnly = false
        this.applyQuestionSetFromState()
        const fullIndex = this.fullQuestions.findIndex(item => item.id === questionId)
        this.current = fullIndex >= 0 ? fullIndex : 0
      }

      this.persistUserData()
    },
    buttonClass(choice) {
      if (!this.showAnswer) return this.selectedChoices.includes(choice) ? 'selected' : ''
      const isCorrect = this.question.answers.includes(choice)
      const isSelected = this.selectedChoices.includes(choice)
      if (isCorrect) return 'correct'
      if (isSelected && !isCorrect) return 'incorrect'
      return ''
    },
    nextQuestion() {
      if (this.current + 1 < this.questions.length) {
        this.current += 1
        this.resetSession()
        this.persistUserData()
      }
    },
    prevQuestion() {
      if (this.current > 0) {
        this.current -= 1
        this.resetSession()
        this.persistUserData()
      }
    },
    goTo(index) {
      this.current = index
      this.resetSession()
      this.persistUserData()
    },
    jumpTo() {
      if (this.jumpNumber && this.jumpNumber >= 1 && this.jumpNumber <= this.questions.length) {
        this.goTo(this.jumpNumber - 1)
      } else {
        alert('올바른 문제 번호를 입력하세요.')
      }
    },
    resetSession() {
      this.selectedChoices = []
      this.showAnswer = false
      this.showExplanation = false
    }
  },
  mounted() {
    if (!this.dbEnabled) this.dbStatus = 'DB 설정 오류: Supabase 환경변수가 필요합니다.'
    this.restoreSession()
  },
  beforeUnmount() {
    if (this.sessionTimeoutId) {
      clearTimeout(this.sessionTimeoutId)
      this.sessionTimeoutId = null
    }
  }
}
</script>

<style scoped>
  .app-shell {
    max-width: 980px;
    margin: 2rem auto;
    padding: 0 1rem 2rem;
    color: #0f172a;
  }
  .eyebrow { margin: 0 0 0.2rem; color: #64748b; font-weight: 700; letter-spacing: 0.06em; font-size: 0.85rem; }
  .dashboard-title { margin: 0; font-size: 1.7rem; line-height: 1.25; }
.top-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 16px;
}
.logout-button { min-width: 220px; }
.content-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 1rem;
}
.right-sidebar { display: flex; flex-direction: column; gap: 0.8rem; }
.main-area { min-width: 0; }
.card {
  padding: 1rem;
  border: 1px solid #cbd5e1;
  border-radius: 18px;
  background: #f8fafc;
}
.question-card { background: #f8fafc; }
.question-copy { font-size: 1.25rem; line-height: 1.5; font-weight: 700; margin: 0.9rem 0; }
.progress-chip { display: inline-flex; padding: 0.15rem 0.7rem; border-radius: 999px; background: #bfdbfe; color: #1d4ed8; font-size: 0.9rem; font-weight: 700; margin-bottom: 0.45rem; }
.result-box {
  margin-top: 0.8rem;
  padding-top: 0.8rem;
  border-top: 1px dashed #d1d5db;
}
.login-panel {
  max-width: 520px;
  margin: 9rem auto;
  padding: 1.25rem;
  border: 1px solid #cbd5e1;
  border-radius: 20px;
  background: #f8fafc;
}
.login-title { margin: 0 0 0.4rem; font-size: 1.9rem; line-height: 1.25; }
.login-copy { margin-top: 0; margin-bottom: 0.85rem; font-size: 0.98rem; }
.login-form { display: grid; gap: 0.55rem; margin-top: 0.8rem; }
.login-label { font-size: 0.95rem; font-weight: 700; color: #334155; }
.login-input {
  width: 100%;
  min-height: 44px;
  padding: 0.65rem 0.75rem;
  border: 1px solid #bfdbfe;
  border-radius: 14px;
  box-sizing: border-box;
  font-size: 1rem;
}
.login-input:focus { outline: none; border-color: #93c5fd; }
button {
  min-height: 44px;
  border-radius: 14px;
  border: 1px solid #bfdbfe;
  background: #e2e8f0;
  color: #1e293b;
  font-weight: 600;
  padding: 0.55rem 0.85rem;
}
.primary-button, .login-button { width: 100%; margin-top: 0.4rem; border: 0; background: #2952cc; color: #fff; }
.secondary-button { width: 100%; }
.login-button:disabled { opacity: 0.55; cursor: not-allowed; }
.row { display: flex; gap: 0.5rem; align-items: center; flex-wrap: nowrap; }
.stack-buttons { display: grid; gap: 0.65rem; }
.toggle-password { min-width: 88px; }
.mt { margin-top: 1rem; }
.mt-lg { margin-top: 2rem; }
.muted { color: #64748b; font-size: 0.9rem; }
.login-help { margin-top: 0.65rem; }
.error-message { color: #dc2626; font-size: 0.9rem; margin-top: 0.7rem; }
.recent-strip { display: flex; gap: 4px; margin: 0.4rem 0 0.8rem; flex-wrap: wrap; }
.dot { width: 10px; height: 10px; border-radius: 999px; display: inline-block; }
.dot-correct { background: #10b981; }
.dot-incorrect { background: #ef4444; }
.section-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
.section-head h3 { margin: 0; }
.badge { padding: 0.15rem 0.5rem; border-radius: 999px; background: #dbeafe; color: #3343d1; font-size: 0.8rem; font-weight: 700; }
.stats-main { font-size: 1.4rem; font-weight: 700; margin: 0 0 0.35rem; }
.choice-button { width: 100%; text-align: left; margin-bottom: 0.55rem; padding: 0.78rem; font-size: 1rem; line-height: 1.45; }
button.selected { border: 2px solid #3b82f6; background-color: #dbeafe; }
button.correct { background-color: #d1fae5; border: 2px solid #10b981; }
button.incorrect { background-color: #fee2e2; border: 2px solid #ef4444; }
progress { width: 100%; height: 10px; }

@media (max-width: 640px) {
  .app-shell { margin-top: 1rem; }
  .login-panel {
    margin: 1rem 0.2rem;
    padding: 1rem;
  }
  .login-title, .dashboard-title { font-size: 1.35rem; }
  .question-copy { font-size: 1.1rem; }
}

@media (max-width: 900px) {
  .content-layout { grid-template-columns: 1fr; }
  .top-header { flex-direction: column; align-items: stretch; }
  .logout-button { min-width: 0; width: 100%; }
}
</style>
