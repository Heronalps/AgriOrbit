<script setup lang="ts">
// type OptionsType = { // Commented out unused type
//   name: string
//   key: string
// }

interface DataItem {
  [key: string]: string | number | boolean | null | undefined
}

defineProps<{
  placeholder?: string
  data: Array<DataItem>
  keyBy: string
  labelBy: string
  modelValue: string | number | null | undefined // Add modelValue for v-model support
}>()

const emit = defineEmits(['update:modelValue']) // Define emit function for v-model

const handleChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  emit('update:modelValue', target.value) // Emit the selected value
}
</script>
<template>
  <select
    class="
      select select-bordered select-primary
      w-full
      max-w-xs
      px-3
      py-1
      md:py-2
      w-60
      font-medium
      md:text-base
      text-sm
    "
    :value="modelValue"
    @change="handleChange"
  >
    <option v-if="placeholder" disabled="disabled">
      {{ placeholder }}
    </option>
    <option
      v-for="item in data"
      :key="item[keyBy]"
      :value="item[keyBy]"
      class="bg-gray-200"
    >
      {{ item[labelBy] }}
    </option>
  </select>
</template>
