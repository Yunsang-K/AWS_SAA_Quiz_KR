<template>
  <section class="card panel-card">
    <div class="panel-head">
      <h3>학습 통계</h3>
      <span class="chip chip-soft">LIVE</span>
    </div>

    <div class="metric-box">
      <p class="metric-title">누적 정답률</p>
      <p class="metric-value">{{ accuracyRate }}% <span class="muted-inline">({{ stats.totalCorrect }}/{{ stats.totalAnswered }})</span></p>
      <progress :value="Number(accuracyRate)" max="100"></progress>
    </div>

    <div class="metric-box mt">
      <p class="metric-title">최근 {{ recentWindowSize }}문제</p>
      <p class="metric-value">{{ recentAccuracyRate }}%</p>
      <div class="recent-strip">
        <span
          v-for="(result, idx) in stats.recentResults"
          :key="idx"
          :class="['dot', result ? 'dot-correct' : 'dot-incorrect']"
        ></span>
      </div>
    </div>

    <label class="field-label mt" for="wrong-policy">오답 정책</label>
    <select id="wrong-policy" class="input" :value="wrongPolicy" @change="$emit('update:wrong-policy', $event.target.value)">
      <option value="keep_history">틀리면 계속 유지</option>
      <option value="remove_on_correct">정답 시 오답 제거</option>
    </select>

    <p class="helper-text mt-sm">DB 상태: {{ dbEnabled ? dbStatus : '로컬 저장 모드' }}</p>

    <div class="mt" v-if="stats.mockExamHistory.length">
      <p class="metric-title">최근 모의고사 이력</p>
      <ul class="history-list">
        <li v-for="(exam, i) in stats.mockExamHistory.slice(0, 5)" :key="i">
          {{ exam.date }} · {{ exam.correct }}/{{ exam.size }} ({{ exam.accuracy }}%)
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup>
defineProps({
  stats: { type: Object, required: true },
  accuracyRate: { type: String, required: true },
  recentAccuracyRate: { type: String, required: true },
  recentWindowSize: { type: Number, required: true },
  wrongPolicy: { type: String, required: true },
  dbEnabled: { type: Boolean, required: true },
  dbStatus: { type: String, required: true }
})

defineEmits(['update:wrong-policy'])
</script>
