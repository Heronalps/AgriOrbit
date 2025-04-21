<script setup lang="ts">
/**
 * Interface for a generic data item that can be passed to the SelectMenu.
 * Allows for flexible data structures where key and label properties can be specified by `keyBy` and `labelBy` props.
 */
interface DataItem {
  [key: string]: string | number | boolean | null | undefined
}

/**
 * Props for the SelectMenu component.
 */
interface SelectMenuProps {
  /**
   * Optional placeholder text to display when no option is selected.
   */
  placeholder?: string
  /**
   * An array of data items to populate the select options.
   * Each item should be an object that can be accessed using `keyBy` and `labelBy`.
   */
  data: Array<DataItem>
  /**
   * The property name in each data item to be used as the unique key for the option (its value).
   */
  keyBy: string
  /**
   * The property name in each data item to be displayed as the label for the option.
   */
  labelBy: string
  /**
   * The current value of the select menu. Used for v-model integration.
   * Can be a string, number, or null/undefined if no value is selected.
   */
  modelValue: string | number | null | undefined
}

// Define component props with the interface
const props = defineProps<SelectMenuProps>()

/**
 * Defines the events emitted by this component.
 * Supports `v-model` through the `update:modelValue` event.
 */
const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number | null | undefined): void
}>()

/**
 * Handles the change event of the native select element.
 * Emits the `update:modelValue` event with the new selected value to support `v-model`.
 * @param {Event} event - The native change event from the select element.
 */
const handleChange = (event: Event): void => {
  const target = event.target as HTMLSelectElement
  // Ensure that if the placeholder is re-selected (if it were possible and had a value),
  // or if a value is cleared, we handle it. Typically, disabled options aren't selected.
  emit('update:modelValue', target.value)
}
</script>

<template>
  <select
    class="select select-bordered select-primary w-full max-w-xs px-3 py-1 md:py-2 font-medium md:text-base text-sm bg-white text-gray-900 border-gray-300 focus:border-primary focus:ring-primary"
    :value="props.modelValue"
    @change="handleChange"
  >
    <!-- Display placeholder if provided and no value is selected -->
    <option
      v-if="props.placeholder"
      value=""
      :disabled="!props.modelValue"
      :selected="!props.modelValue"
    >
      {{ props.placeholder }}
    </option>
    <!-- Iterate over data to create options -->
    <!-- eslint-disable vue/no-deprecated-filter -->
    <option
      v-for="item in props.data"
      :key="item[props.keyBy] as string | number"
      :value="item[props.keyBy]"
      class="bg-gray-200 text-gray-900"
    >
      {{ item[props.labelBy] }}
    </option>
    <!-- eslint-enable vue/no-deprecated-filter -->
  </select>
</template>

<style scoped>
/* Add any component-specific styles here */
.select {
  /* Ensure consistent appearance, Tailwind classes usually handle this */
  /* Example: Add a specific border or background if needed beyond Tailwind defaults */
}

/* Styling for options, though often limited by browser defaults */
.select option {
  /* Example: padding or color, but cross-browser consistency can be an issue */
}
</style>
