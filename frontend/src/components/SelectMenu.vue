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
 * Handles the change event when a dropdown option is selected.
 * Emits the update:modelValue event with the new selected value from the PDropdown component.
 * @param {Event} event - The change event with the selected option value.
 */
const handleChange = (event: any): void => {
  emit('update:modelValue', event.value)
}
</script>

<template>
  <PDropdown
    :model-value="props.modelValue"
    :options="props.data"
    :option-label="props.labelBy"
    :option-value="props.keyBy"
    :placeholder="props.placeholder || 'Select'"
    class="w-full"
    @change="handleChange"
  />
</template>

<style scoped>
/* Enhanced styles for the dropdown component */
:deep(.p-dropdown) {
  width: 100%;
  max-width: 20rem;
}

:deep(.p-dropdown-label) {
  font-weight: 500;
}

/* Widget dark theme styling */
.widget-dark-theme :deep(.p-dropdown) {
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.widget-dark-theme :deep(.p-dropdown:hover),
.widget-dark-theme :deep(.p-dropdown:focus) {
  border-color: #368535;
}

.widget-dark-theme :deep(.p-dropdown-panel) {
  background-color: #1a1a1a;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.widget-dark-theme :deep(.p-dropdown-panel .p-dropdown-items .p-dropdown-item) {
  color: white;
  padding: 0.75rem 1rem;
}

.widget-dark-theme :deep(.p-dropdown-panel .p-dropdown-items .p-dropdown-item:hover) {
  background-color: rgba(54, 133, 53, 0.2);
}

/* Light theme styling (default) */
:deep(.p-dropdown.p-component) {
  background-color: white;
  border-color: var(--neutral-300);
}

:deep(.p-dropdown.p-component:hover) {
  border-color: var(--primary-light);
}

:deep(.p-dropdown-panel .p-dropdown-items .p-dropdown-item) {
  padding: 0.75rem 1rem;
}
</style>
