<script setup lang="ts">
// type OptionsType = { // Commented out unused type
//   name: string
//   key: string
// }

interface DataItem {
  [key: string]: string | number | boolean | null | undefined;
}

// const props = defineProps<{ // Commented out unused variable assignment
defineProps<{
  placeholder?: string
  data: Array<DataItem>
  keyBy: string
  labelBy: string
}>()
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
  >
    <option
      v-if="placeholder"
      disabled="disabled"
      selected="selected"
    >
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
