<template>
  <section class="auth-shell">
    <div class="auth-card card">
      <p class="eyebrow">AWS SAA Quiz</p>
      <h1 class="auth-title">학습을 다시 시작해볼까요?</h1>
      <p class="auth-subtitle">로그인 후 오답, 정답률, 마지막 위치를 자동으로 복원합니다.</p>

      <div class="field-stack">
        <label class="field-label" for="login-id">로그인 ID</label>
        <input
          id="login-id"
          class="input"
          :value="loginId"
          placeholder="예: saa-lee"
          @input="$emit('update:loginId', $event.target.value)"
          @keyup.enter="$emit('submit')"
        />
      </div>

      <div class="field-stack">
        <label class="field-label" for="login-password">비밀번호</label>
        <div class="input-with-action">
          <input
            id="login-password"
            class="input"
            :type="showPassword ? 'text' : 'password'"
            :value="password"
            placeholder="비밀번호 입력"
            @input="$emit('update:password', $event.target.value)"
            @keyup.enter="$emit('submit')"
          />
          <button class="btn btn-ghost" type="button" @click="$emit('toggle-password')">
            {{ showPassword ? '숨기기' : '표시' }}
          </button>
        </div>
      </div>

      <p v-if="loginError" class="status-error">{{ loginError }}</p>

      <button class="btn btn-primary auth-submit" type="button" :disabled="isLoginDisabled" @click="$emit('submit')">
        Enter로 시작
      </button>

      <p class="helper-text">기본 비밀번호는 <strong>quiz1234</strong> 입니다. (`VITE_APP_LOGIN_PASSWORD`로 변경 가능)</p>
    </div>
  </section>
</template>

<script setup>
defineProps({
  loginId: { type: String, required: true },
  password: { type: String, required: true },
  showPassword: { type: Boolean, required: true },
  loginError: { type: String, default: '' },
  isLoginDisabled: { type: Boolean, required: true }
})

defineEmits(['update:loginId', 'update:password', 'toggle-password', 'submit'])
</script>
