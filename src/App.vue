<template>
  <div class="app-shell">
    <header class="top-header" v-if="isLoggedIn">
      <div><strong>{{ currentUser }}</strong> 로그인됨</div>
      <button @click="logout">로그아웃</button>
    </header>

    <div v-if="!isLoggedIn" class="login-panel">
      <h3 class="login-title">로그인</h3>
      <p class="muted">ID별로 오답, 정답률, 마지막 문제 위치를 저장합니다.</p>

      <form class="login-form" @submit.prevent="login">
        <label class="login-label" for="login-id">아이디</label>
        <input
          id="login-id"
          v-model.trim="loginId"
          class="login-input"
          placeholder="로그인 ID 입력"
          autocomplete="username"
        />

        <label class="login-label" for="login-password">비밀번호</label>
        <input
          id="login-password"
          v-model="loginPassword"
          class="login-input"
          type="password"
          placeholder="비밀번호 입력"
          autocomplete="current-password"
        />

        <button type="submit" class="login-button" :disabled="!loginId || !loginPassword">시작</button>
      </form>

      <p v-if="loginError" class="error-message">{{ loginError }}</p>
    </div>

    <div v-else class="content-layout">
      <aside class="left-sidebar">
        <section class="card">
          <h3>모의고사</h3>
          <div class="row">
            <input
              type="number"
              min="1"
              :max="fullQuestions.length"
              v-model.number="mockSizeInput"
              placeholder="문항 수"
            />
            <button @click="startMockExam">시작</button>
          </div>
          <button v-if="isMockMode" @click="finishMockExam">모의고사 종료</button>
          <p v-if="isMockMode" class="muted">진행: {{ current + 1 }} / {{ questions.length }}</p>

          <div v-if="lastMockResult" class="result-box">
            <p><strong>최근 모의고사</strong></p>
            <p>{{ lastMockResult.correct }} / {{ lastMockResult.size }} ({{ lastMockResult.accuracy }}%)</p>
          </div>
        </section>

        <section class="card">
          <h3>틀린 문제 번호</h3>
          <p>{{ wrongAnswers.join(', ') || '없음' }}</p>
          <button v-if="wrongAnswers.length" @click="toggleWrongOnly">
            {{ viewWrongOnly ? '전체 문제 보기' : '틀린 문제만 보기' }}
          </button>
        </section>
      </aside>

      <main class="main-area">
        <progress :value="safeProgressValue" :max="safeProgressMax"></progress>
        <p>진행률: {{ safeProgressValue }} / {{ safeProgressMax }}</p>

        <div v-if="question">
          <p>{{ question.question }}</p>
          <div v-for="(text, key) in question.choices" :key="key">
            <button :class="buttonClass(key)" @click="toggleChoice(key)">
              {{ key }}. {{ text }}
            </button>
          </div>

          <div v-if="showAnswer">
            <p><strong>정답:</strong> {{ question.answers.join(', ') }}</p>
            <button @click="showExplanation = true">해설 보기</button>
          </div>

          <div v-if="showExplanation" class="mt">
            <p v-for="(exp, i) in question.explanations" :key="i">• {{ exp }}</p>
          </div>

          <div class="row mt">
            <button @click="prevQuestion" :disabled="current === 0">이전 문제</button>
            <button @click="nextQuestion" :disabled="current + 1 >= questions.length">다음 문제</button>
          </div>
        </div>

        <div v-else class="card mt-lg">
          <p>표시할 문제가 없습니다.</p>
        </div>

        <div class="card mt-lg">
          <h3>문제 번호 이동</h3>
          <div class="row">
            <input type="number" v-model.number="jumpNumber" placeholder="번호 입력" min="1" :max="questions.length || 1" />
            <button @click="jumpTo">이동</button>
          </div>
        </div>

        <div class="card">
          <p><strong>누적 정답률:</strong> {{ accuracyRate }}% ({{ stats.totalCorrect }}/{{ stats.totalAnswered }})</p>
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
          <p class="muted">DB 상태: {{ dbEnabled ? dbStatus : '로컬 저장 모드' }}</p>

          <div class="mt" v-if="stats.mockExamHistory.length">
            <p><strong>최근 모의고사 이력</strong></p>
            <ul>
              <li v-for="(exam, i) in stats.mockExamHistory.slice(0, 5)" :key="i">
                {{ exam.date }} - {{ exam.correct }}/{{ exam.size }} ({{ exam.accuracy }}%)
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script>
import questions from './questions.json'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const RECENT_WINDOW_SIZE = 20

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
      lastMockResult: null
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
    userKey(suffix) {
      return `awsQuiz:${this.currentUser}:${suffix}`
    },
    normalizeStats(payload) {
      return {
        totalAnswered: payload.totalAnswered || 0,
        totalCorrect: payload.totalCorrect || 0,
        recentResults: payload.recentResults || [],
        mockExamHistory: payload.mockExamHistory || []
      }
    },
    login() {
      if (!this.loginId || !this.loginPassword) return
      if (!(this.loginId === 'yun' && this.loginPassword === 'yunsang123')) {
        this.loginError = '아이디 또는 비밀번호가 올바르지 않습니다.'
        this.isLoggedIn = false
        this.currentUser = ''
        localStorage.removeItem('awsQuiz:currentUser')
        return
      }
      this.loginError = ''
      this.currentUser = this.loginId
      this.isLoggedIn = true
      localStorage.setItem('awsQuiz:currentUser', this.currentUser)
      this.loadUserData()
      this.applyQuestionSetFromState()
      this.restoreCurrentIndex()
      if (this.dbEnabled) this.syncFromDb()
    },
    logout() {
      this.isLoggedIn = false
      this.currentUser = ''
      this.loginId = ''
      this.loginPassword = ''
      this.loginError = ''
      localStorage.removeItem('awsQuiz:currentUser')
      this.questions = this.fullQuestions
      this.current = 0
      this.resetSession()
    },
    loadUserData() {
      const wrong = localStorage.getItem(this.userKey('wrongAnswers'))
      const stats = localStorage.getItem(this.userKey('stats'))
      const settings = localStorage.getItem(this.userKey('settings'))

      this.wrongAnswers = wrong ? JSON.parse(wrong) : []
      this.stats = this.normalizeStats(stats ? JSON.parse(stats) : {})

      const parsed = settings ? JSON.parse(settings) : {}
      this.wrongPolicy = parsed.wrongPolicy || 'keep_history'
      this.viewWrongOnly = Boolean(parsed.viewWrongOnly)
      this.isMockMode = Boolean(parsed.isMockMode)
      this.mockQuestionIds = parsed.mockQuestionIds || []
      this.mockAnswered = parsed.mockAnswered || 0
      this.mockCorrect = parsed.mockCorrect || 0
      this.lastMockResult = parsed.lastMockResult || null
    },
    persistUserData() {
      if (!this.currentUser) return
      localStorage.setItem(this.userKey('wrongAnswers'), JSON.stringify(this.wrongAnswers))
      localStorage.setItem(this.userKey('stats'), JSON.stringify(this.stats))
      localStorage.setItem(
        this.userKey('settings'),
        JSON.stringify({
          wrongPolicy: this.wrongPolicy,
          viewWrongOnly: this.viewWrongOnly,
          isMockMode: this.isMockMode,
          mockQuestionIds: this.mockQuestionIds,
          mockAnswered: this.mockAnswered,
          mockCorrect: this.mockCorrect,
          lastMockResult: this.lastMockResult
        })
      )
      localStorage.setItem(this.userKey('currentIndex'), String(this.current))
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
    restoreCurrentIndex() {
      const saved = Number(localStorage.getItem(this.userKey('currentIndex')) || 0)
      this.current = Number.isInteger(saved) ? saved : 0
      if (this.current < 0 || this.current >= this.questions.length) this.current = 0
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
        if (!res.ok) throw new Error('DB 조회 실패')
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
          this.restoreCurrentIndex()
          this.persistUserData()
        }
        this.dbStatus = '불러오기 완료'
      } catch {
        this.dbStatus = '불러오기 실패(로컬 사용 중)'
      }
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
        const res = await fetch(`${SUPABASE_URL}/rest/v1/quiz_user_state`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            Prefer: 'resolution=merge-duplicates'
          },
          body: JSON.stringify(payload)
        })
        if (!res.ok) throw new Error('DB 저장 실패')
        this.dbStatus = '저장 완료'
      } catch {
        this.dbStatus = '저장 실패'
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
      if (this.dbEnabled) this.syncToDb()
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

      this.stats.totalAnswered += 1
      if (isCorrect) this.stats.totalCorrect += 1
      this.stats.recentResults.push(isCorrect)
      if (this.stats.recentResults.length > RECENT_WINDOW_SIZE) this.stats.recentResults.shift()

      if (this.isMockMode) {
        this.mockAnswered += 1
        if (isCorrect) this.mockCorrect += 1
      }

      const questionId = this.question.id
      if (!isCorrect) {
        if (!this.wrongAnswers.includes(questionId)) this.wrongAnswers.push(questionId)
      } else if (this.wrongPolicy === 'remove_on_correct') {
        this.wrongAnswers = this.wrongAnswers.filter(id => id !== questionId)
      }

      this.persistUserData()
      if (this.dbEnabled) this.syncToDb()
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
  }
}
</script>

<style scoped>
.app-shell { max-width: 1200px; margin: 0 auto; }
.top-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
}
.content-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 1rem;
}
.left-sidebar { display: flex; flex-direction: column; gap: 0.8rem; }
.main-area { min-width: 0; }
.card {
  padding: 0.8rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
}
.result-box {
  margin-top: 0.8rem;
  padding-top: 0.8rem;
  border-top: 1px dashed #d1d5db;
}
.login-panel {
  max-width: 420px;
  margin: 2rem auto;
  padding: 1.25rem;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 6px 20px rgba(15, 23, 42, 0.06);
}
.login-title { margin: 0 0 0.4rem; }
.login-form { display: grid; gap: 0.55rem; margin-top: 0.8rem; }
.login-label { font-size: 0.9rem; font-weight: 600; color: #374151; }
.login-input {
  width: 100%;
  min-height: 44px;
  padding: 0.65rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  box-sizing: border-box;
}
.login-input:focus { outline: 2px solid #93c5fd; outline-offset: 1px; }
.login-button {
  width: 100%;
  min-height: 44px;
  margin-top: 0.4rem;
  border: 0;
  border-radius: 8px;
  background: #2563eb;
  color: #fff;
  font-weight: 600;
}
.login-button:disabled { opacity: 0.55; cursor: not-allowed; }
.row { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
.mt { margin-top: 1rem; }
.mt-lg { margin-top: 2rem; }
.muted { color: #6b7280; font-size: 0.9rem; }
.error-message { color: #dc2626; font-size: 0.9rem; margin-top: 0.7rem; }
.recent-strip { display: flex; gap: 4px; margin: 0.4rem 0 0.8rem; flex-wrap: wrap; }
.dot { width: 10px; height: 10px; border-radius: 999px; display: inline-block; }
.dot-correct { background: #10b981; }
.dot-incorrect { background: #ef4444; }
button.selected { border: 2px solid #3b82f6; background-color: #e0f2fe; }
button.correct { background-color: #d1fae5; border: 2px solid #10b981; }
button.incorrect { background-color: #fee2e2; border: 2px solid #ef4444; }

@media (max-width: 640px) {
  .login-panel {
    margin: 1rem 0.75rem;
    padding: 1rem;
  }
}

@media (max-width: 900px) {
  .content-layout { grid-template-columns: 1fr; }
}
</style>
