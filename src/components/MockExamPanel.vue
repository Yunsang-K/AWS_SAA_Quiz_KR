<template>
  <section class="card panel-card">
    <div class="panel-head">
      <h3>모의고사</h3>
      <span class="chip">랜덤</span>
    </div>

    <div class="inline-row">
      <input
        class="input"
        type="number"
        min="1"
        :max="fullLength"
        :value="mockSizeInput"
        placeholder="문항 수"
        @input="$emit('update:mock-size', Number($event.target.value))"
      />
      <button class="btn btn-primary" @click="$emit('start-mock')">시작</button>
    </div>

    <button v-if="isMockMode" class="btn btn-danger mt" @click="$emit('finish-mock')">모의고사 종료</button>
    <p v-if="isMockMode" class="helper-text">진행: {{ current + 1 }} / {{ questionLength }}</p>

    <div v-if="lastMockResult" class="metric-box">
      <p class="metric-title">최근 모의고사</p>
      <p class="metric-value">{{ lastMockResult.correct }} / {{ lastMockResult.size }} ({{ lastMockResult.accuracy }}%)</p>
    </div>
  </section>
</template>

<script setup>
defineProps({
  mockSizeInput: { type: Number, required: true },
  fullLength: { type: Number, required: true },
  current: { type: Number, required: true },
  questionLength: { type: Number, required: true },
  isMockMode: { type: Boolean, required: true },
  lastMockResult: { type: Object, default: null }
})

defineEmits(['update:mock-size', 'start-mock', 'finish-mock'])
</script>
