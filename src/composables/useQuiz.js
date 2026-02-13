import { computed, ref } from 'vue'
import questionsData from '../questions.json'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const RECENT_WINDOW_SIZE = 20

export function useQuiz(currentUserRef) {
  const fullQuestions = ref(questionsData)
  const questions = ref(questionsData)
  const current = ref(0)
  const selectedChoices = ref([])
  const showAnswer = ref(false)
  const showExplanation = ref(false)
  const wrongAnswers = ref([])
  const viewWrongOnly = ref(false)
  const jumpNumber = ref(null)
  const dbEnabled = ref(Boolean(SUPABASE_URL && SUPABASE_ANON_KEY))
  const dbStatus = ref('대기')
  const wrongPolicy = ref('keep_history')
  const stats = ref({ totalAnswered: 0, totalCorrect: 0, recentResults: [], mockExamHistory: [] })
  const isMockMode = ref(false)
  const mockSizeInput = ref(20)
  const mockQuestionIds = ref([])
  const mockAnswered = ref(0)
  const mockCorrect = ref(0)
  const lastMockResult = ref(null)

  const question = computed(() => questions.value[current.value])
  const accuracyRate = computed(() => {
    if (!stats.value.totalAnswered) return '0.0'
    return ((stats.value.totalCorrect / stats.value.totalAnswered) * 100).toFixed(1)
  })
  const recentAccuracyRate = computed(() => {
    if (!stats.value.recentResults.length) return '0.0'
    const correctCount = stats.value.recentResults.filter(Boolean).length
    return ((correctCount / stats.value.recentResults.length) * 100).toFixed(1)
  })
  const safeProgressMax = computed(() => questions.value.length || 1)
  const safeProgressValue = computed(() => (questions.value.length ? current.value + 1 : 0))

  const userKey = suffix => `awsQuiz:${currentUserRef.value}:${suffix}`
  const normalizeStats = payload => ({
    totalAnswered: payload.totalAnswered || 0,
    totalCorrect: payload.totalCorrect || 0,
    recentResults: payload.recentResults || [],
    mockExamHistory: payload.mockExamHistory || []
  })

  const resetSession = () => {
    selectedChoices.value = []
    showAnswer.value = false
    showExplanation.value = false
  }

  const loadUserData = () => {
    const wrong = localStorage.getItem(userKey('wrongAnswers'))
    const savedStats = localStorage.getItem(userKey('stats'))
    const settings = localStorage.getItem(userKey('settings'))

    wrongAnswers.value = wrong ? JSON.parse(wrong) : []
    stats.value = normalizeStats(savedStats ? JSON.parse(savedStats) : {})

    const parsed = settings ? JSON.parse(settings) : {}
    wrongPolicy.value = parsed.wrongPolicy || 'keep_history'
    viewWrongOnly.value = Boolean(parsed.viewWrongOnly)
    isMockMode.value = Boolean(parsed.isMockMode)
    mockQuestionIds.value = parsed.mockQuestionIds || []
    mockAnswered.value = parsed.mockAnswered || 0
    mockCorrect.value = parsed.mockCorrect || 0
    lastMockResult.value = parsed.lastMockResult || null
  }

  const persistUserData = () => {
    if (!currentUserRef.value) return
    localStorage.setItem(userKey('wrongAnswers'), JSON.stringify(wrongAnswers.value))
    localStorage.setItem(userKey('stats'), JSON.stringify(stats.value))
    localStorage.setItem(
      userKey('settings'),
      JSON.stringify({
        wrongPolicy: wrongPolicy.value,
        viewWrongOnly: viewWrongOnly.value,
        isMockMode: isMockMode.value,
        mockQuestionIds: mockQuestionIds.value,
        mockAnswered: mockAnswered.value,
        mockCorrect: mockCorrect.value,
        lastMockResult: lastMockResult.value
      })
    )
    localStorage.setItem(userKey('currentIndex'), String(current.value))
  }

  const applyQuestionSetFromState = () => {
    if (isMockMode.value && mockQuestionIds.value.length) {
      const set = new Set(mockQuestionIds.value)
      questions.value = fullQuestions.value.filter(q => set.has(q.id))
      return
    }
    questions.value = viewWrongOnly.value
      ? fullQuestions.value.filter(q => wrongAnswers.value.includes(q.id))
      : fullQuestions.value
  }

  const restoreCurrentIndex = () => {
    const saved = Number(localStorage.getItem(userKey('currentIndex')) || 0)
    current.value = Number.isInteger(saved) ? saved : 0
    if (current.value < 0 || current.value >= questions.value.length) current.value = 0
  }

  const syncFromDb = async () => {
    if (!dbEnabled.value || !currentUserRef.value) return
    try {
      dbStatus.value = '불러오는 중...'
      const url = `${SUPABASE_URL}/rest/v1/quiz_user_state?user_id=eq.${encodeURIComponent(currentUserRef.value)}&select=user_id,wrong_answers,total_answered,total_correct,recent_results,wrong_policy,mock_exam_history`
      const res = await fetch(url, {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
      })
      if (!res.ok) throw new Error('DB 조회 실패')
      const rows = await res.json()
      if (rows.length) {
        const row = rows[0]
        wrongAnswers.value = row.wrong_answers || []
        stats.value = normalizeStats({
          totalAnswered: row.total_answered,
          totalCorrect: row.total_correct,
          recentResults: row.recent_results,
          mockExamHistory: row.mock_exam_history
        })
        wrongPolicy.value = row.wrong_policy || 'keep_history'
        applyQuestionSetFromState()
        restoreCurrentIndex()
        persistUserData()
      }
      dbStatus.value = '불러오기 완료'
    } catch {
      dbStatus.value = '불러오기 실패(로컬 사용 중)'
    }
  }

  const syncToDb = async () => {
    if (!dbEnabled.value || !currentUserRef.value) return
    try {
      dbStatus.value = '저장 중...'
      const payload = {
        user_id: currentUserRef.value,
        wrong_answers: wrongAnswers.value,
        total_answered: stats.value.totalAnswered,
        total_correct: stats.value.totalCorrect,
        recent_results: stats.value.recentResults,
        wrong_policy: wrongPolicy.value,
        mock_exam_history: stats.value.mockExamHistory
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
      dbStatus.value = '저장 완료'
    } catch {
      dbStatus.value = '저장 실패'
    }
  }

  const onUserLogin = async () => {
    loadUserData()
    applyQuestionSetFromState()
    restoreCurrentIndex()
    if (dbEnabled.value) await syncFromDb()
  }

  const onUserLogout = () => {
    questions.value = fullQuestions.value
    current.value = 0
    wrongAnswers.value = []
    viewWrongOnly.value = false
    wrongPolicy.value = 'keep_history'
    stats.value = { totalAnswered: 0, totalCorrect: 0, recentResults: [], mockExamHistory: [] }
    isMockMode.value = false
    mockQuestionIds.value = []
    mockAnswered.value = 0
    mockCorrect.value = 0
    lastMockResult.value = null
    jumpNumber.value = null
    resetSession()
  }

  const startMockExam = () => {
    const n = Number(mockSizeInput.value)
    if (!n || n < 1 || n > fullQuestions.value.length) {
      alert('유효한 문항 수를 입력하세요.')
      return
    }
    const pool = [...fullQuestions.value]
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[pool[i], pool[j]] = [pool[j], pool[i]]
    }
    const selected = pool.slice(0, n)
    mockQuestionIds.value = selected.map(q => q.id)
    questions.value = selected
    isMockMode.value = true
    viewWrongOnly.value = false
    mockAnswered.value = 0
    mockCorrect.value = 0
    current.value = 0
    resetSession()
    persistUserData()
  }

  const finishMockExam = () => {
    if (isMockMode.value) {
      const size = questions.value.length
      const accuracy = mockAnswered.value ? ((mockCorrect.value / mockAnswered.value) * 100).toFixed(1) : '0.0'
      lastMockResult.value = {
        date: new Date().toLocaleString('ko-KR'),
        size,
        correct: mockCorrect.value,
        answered: mockAnswered.value,
        accuracy
      }
      stats.value.mockExamHistory.unshift(lastMockResult.value)
      stats.value.mockExamHistory = stats.value.mockExamHistory.slice(0, 20)
    }

    isMockMode.value = false
    mockQuestionIds.value = []
    mockAnswered.value = 0
    mockCorrect.value = 0
    applyQuestionSetFromState()
    current.value = 0
    resetSession()
    persistUserData()
    if (dbEnabled.value) syncToDb()
  }

  const toggleWrongOnly = () => {
    viewWrongOnly.value = !viewWrongOnly.value
    isMockMode.value = false
    mockQuestionIds.value = []
    mockAnswered.value = 0
    mockCorrect.value = 0
    applyQuestionSetFromState()
    current.value = 0
    resetSession()
    persistUserData()
  }

  const submitAnswer = () => {
    showAnswer.value = true
    const selectedSorted = [...selectedChoices.value].sort().join(',')
    const correctSorted = [...question.value.answers].sort().join(',')
    const isCorrect = selectedSorted === correctSorted

    stats.value.totalAnswered += 1
    if (isCorrect) stats.value.totalCorrect += 1
    stats.value.recentResults.push(isCorrect)
    if (stats.value.recentResults.length > RECENT_WINDOW_SIZE) stats.value.recentResults.shift()

    if (isMockMode.value) {
      mockAnswered.value += 1
      if (isCorrect) mockCorrect.value += 1
    }

    const questionId = question.value.id
    if (!isCorrect) {
      if (!wrongAnswers.value.includes(questionId)) wrongAnswers.value.push(questionId)
    } else if (wrongPolicy.value === 'remove_on_correct') {
      wrongAnswers.value = wrongAnswers.value.filter(id => id !== questionId)
    }

    persistUserData()
    if (dbEnabled.value) syncToDb()
  }

  const toggleChoice = choice => {
    if (showAnswer.value || !question.value) return
    const correctCount = question.value.answers.length
    if (selectedChoices.value.includes(choice)) {
      selectedChoices.value = selectedChoices.value.filter(c => c !== choice)
    } else {
      if (selectedChoices.value.length >= correctCount) return
      selectedChoices.value.push(choice)
    }
    if (selectedChoices.value.length === correctCount) submitAnswer()
  }

  const buttonClass = choice => {
    if (!showAnswer.value) return selectedChoices.value.includes(choice) ? 'selected' : ''
    const isCorrect = question.value.answers.includes(choice)
    const isSelected = selectedChoices.value.includes(choice)
    if (isCorrect) return 'correct'
    if (isSelected && !isCorrect) return 'incorrect'
    return ''
  }

  const nextQuestion = () => {
    if (current.value + 1 < questions.value.length) {
      current.value += 1
      resetSession()
      persistUserData()
    }
  }
  const prevQuestion = () => {
    if (current.value > 0) {
      current.value -= 1
      resetSession()
      persistUserData()
    }
  }
  const goTo = index => {
    current.value = index
    resetSession()
    persistUserData()
  }
  const jumpTo = () => {
    if (jumpNumber.value && jumpNumber.value >= 1 && jumpNumber.value <= questions.value.length) {
      goTo(jumpNumber.value - 1)
    } else {
      alert('올바른 문제 번호를 입력하세요.')
    }
  }

  return {
    RECENT_WINDOW_SIZE,
    questions,
    fullQuestionCount: fullQuestions.value.length,
    current,
    question,
    selectedChoices,
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
  }
}
