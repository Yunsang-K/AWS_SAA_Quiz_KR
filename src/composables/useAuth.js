import { computed, ref } from 'vue'

const LOGIN_PASSWORD = import.meta.env.VITE_APP_LOGIN_PASSWORD || 'quiz1234'

export function useAuth() {
  const loginId = ref('')
  const password = ref('')
  const showPassword = ref(false)
  const loginError = ref('')
  const currentUser = ref('')
  const isLoggedIn = ref(false)

  const isLoginDisabled = computed(() => !loginId.value.trim() || !password.value)

  const initializeFromStorage = () => {
    const savedUser = localStorage.getItem('awsQuiz:currentUser')
    if (savedUser) {
      currentUser.value = savedUser
      isLoggedIn.value = true
      loginId.value = savedUser
    }
  }

  const login = () => {
    const trimmedId = loginId.value.trim()
    if (!trimmedId || !password.value) {
      loginError.value = 'ID와 비밀번호를 입력해 주세요.'
      return false
    }

    if (password.value !== LOGIN_PASSWORD) {
      loginError.value = '로그인에 실패했습니다. 비밀번호를 확인해 주세요.'
      return false
    }

    loginError.value = ''
    currentUser.value = trimmedId
    isLoggedIn.value = true
    localStorage.setItem('awsQuiz:currentUser', trimmedId)
    return true
  }

  const logout = () => {
    isLoggedIn.value = false
    currentUser.value = ''
    loginId.value = ''
    password.value = ''
    showPassword.value = false
    loginError.value = ''
    localStorage.removeItem('awsQuiz:currentUser')
  }

  return {
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
  }
}
