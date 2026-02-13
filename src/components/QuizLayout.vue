<template>
  <div class="content-layout">
    <main class="main-area mobile-primary">
      <section class="card question-card">
        <div class="progress-head">
          <span class="chip">Question {{ safeProgressValue }}/{{ safeProgressMax }}</span>
          <progress :value="safeProgressValue" :max="safeProgressMax"></progress>
        </div>

        <div v-if="question">
          <p class="question-text">{{ question.question }}</p>

          <div v-for="(text, key) in question.choices" :key="key" class="choice-row">
            <button class="btn btn-choice" :class="buttonClass(key)" @click="$emit('toggle-choice', key)">
              <span class="choice-key">{{ key }}</span>
              <span>{{ text }}</span>
            </button>
          </div>

          <div v-if="showAnswer" class="answer-box mt">
            <p><strong>정답:</strong> {{ question.answers.join(', ') }}</p>
            <button class="btn btn-secondary mt-sm" @click="$emit('show-explanation')">해설 보기</button>
          </div>

          <div v-if="showExplanation" class="explain-box mt">
            <p v-for="(exp, i) in question.explanations" :key="i">• {{ exp }}</p>
          </div>

          <div class="inline-row mt">
            <button class="btn btn-secondary" @click="$emit('prev-question')" :disabled="current === 0">이전 문제</button>
            <button class="btn btn-secondary" @click="$emit('next-question')" :disabled="current + 1 >= questions.length">다음 문제</button>
          </div>
        </div>

        <div v-else class="empty-box">
          <p>표시할 문제가 없습니다.</p>
        </div>
      </section>

      <section class="card panel-card mt-lg">
        <div class="panel-head">
          <h3>문제 번호 이동</h3>
        </div>
        <div class="inline-row">
          <input
            class="input"
            type="number"
            :value="jumpNumber || ''"
            placeholder="번호 입력"
            min="1"
            :max="questions.length || 1"
            @input="$emit('update:jump-number', Number($event.target.value))"
            @keyup.enter="$emit('jump-to')"
          />
          <button class="btn btn-primary" @click="$emit('jump-to')">이동</button>
        </div>
      </section>
    </main>

    <aside class="left-sidebar">
      <section class="card panel-card mobile-primary">
        <div class="panel-head">
          <h3>오답 노트</h3>
          <span class="chip chip-soft">{{ wrongAnswers.length }}개</span>
        </div>
        <p class="wrong-list">{{ wrongAnswers.join(', ') || '아직 없습니다 🎉' }}</p>
        <button v-if="wrongAnswers.length" class="btn btn-secondary mt" @click="$emit('toggle-wrong-only')">
          {{ viewWrongOnly ? '전체 문제 보기' : '틀린 문제만 보기' }}
        </button>
      </section>

      <MockExamPanel
        :mock-size-input="mockSizeInput"
        :full-length="fullLength"
        :current="current"
        :question-length="questions.length"
        :is-mock-mode="isMockMode"
        :last-mock-result="lastMockResult"
        @update:mock-size="$emit('update:mock-size', $event)"
        @start-mock="$emit('start-mock')"
        @finish-mock="$emit('finish-mock')"
      />

      <StatsPanel
        :stats="stats"
        :accuracy-rate="accuracyRate"
        :recent-accuracy-rate="recentAccuracyRate"
        :recent-window-size="recentWindowSize"
        :wrong-policy="wrongPolicy"
        :db-enabled="dbEnabled"
        :db-status="dbStatus"
        @update:wrong-policy="$emit('update:wrong-policy', $event)"
      />
    </aside>
  </div>
</template>

<script setup>
import MockExamPanel from './MockExamPanel.vue'
import StatsPanel from './StatsPanel.vue'

defineProps({
  questions: { type: Array, required: true },
  current: { type: Number, required: true },
  question: { type: Object, default: null },
  wrongAnswers: { type: Array, required: true },
  viewWrongOnly: { type: Boolean, required: true },
  stats: { type: Object, required: true },
  mockSizeInput: { type: Number, required: true },
  fullLength: { type: Number, required: true },
  isMockMode: { type: Boolean, required: true },
  lastMockResult: { type: Object, default: null },
  safeProgressMax: { type: Number, required: true },
  safeProgressValue: { type: Number, required: true },
  showAnswer: { type: Boolean, required: true },
  showExplanation: { type: Boolean, required: true },
  jumpNumber: { type: Number, default: null },
  buttonClass: { type: Function, required: true },
  accuracyRate: { type: String, required: true },
  recentAccuracyRate: { type: String, required: true },
  recentWindowSize: { type: Number, required: true },
  wrongPolicy: { type: String, required: true },
  dbEnabled: { type: Boolean, required: true },
  dbStatus: { type: String, required: true }
})

defineEmits([
  'update:mock-size',
  'start-mock',
  'finish-mock',
  'toggle-wrong-only',
  'toggle-choice',
  'show-explanation',
  'prev-question',
  'next-question',
  'update:jump-number',
  'jump-to',
  'update:wrong-policy'
])
</script>
