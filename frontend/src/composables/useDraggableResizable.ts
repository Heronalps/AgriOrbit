import { ref, onMounted, onBeforeUnmount, type Ref } from 'vue'

interface Position {
  x: number
  y: number
}

interface Dimensions {
  width: number
  height: number
}

export function useDraggableResizable(
  elementRef: Ref<HTMLElement | null>,
  initialPosition: Position,
  initialDimensions: Dimensions,
) {
  const position = ref<Position>({ ...initialPosition })
  const dimensions = ref<Dimensions>({ ...initialDimensions })

  const isDragging = ref(false)
  const initialMousePos = ref<Position>({ x: 0, y: 0 })
  const initialWidgetPos = ref<Position>({ x: 0, y: 0 })

  const startDrag = (event: MouseEvent) => {
    event.preventDefault()
    isDragging.value = true
    initialMousePos.value = { x: event.clientX, y: event.clientY }
    if (elementRef.value) {
      initialWidgetPos.value = {
        x: position.value.x,
        y: position.value.y,
      }
    }
    document.addEventListener('mousemove', onDrag)
    document.addEventListener('mouseup', stopDrag)
  }

  const onDrag = (event: MouseEvent) => {
    if (!isDragging.value || !elementRef.value) return

    const dx = event.clientX - initialMousePos.value.x
    const dy = event.clientY - initialMousePos.value.y

    position.value.x = initialWidgetPos.value.x + dx
    position.value.y = initialWidgetPos.value.y + dy

    adjustBounds()
  }

  const stopDrag = () => {
    isDragging.value = false
    document.removeEventListener('mousemove', onDrag)
    document.removeEventListener('mouseup', stopDrag)
  }

  const adjustBounds = () => {
    if (!elementRef.value) return
    const padding = 10

    let currentX = position.value.x
    let currentY = position.value.y
    const elementWidth = dimensions.value.width
    const elementHeight = dimensions.value.height

    currentX = Math.max(padding, currentX)
    currentY = Math.max(padding, currentY)

    const maxX = window.innerWidth - elementWidth - padding
    const maxY = window.innerHeight - elementHeight - padding

    position.value.x = Math.min(currentX, maxX)
    position.value.y = Math.min(currentY, maxY)

    if (position.value.x < padding) position.value.x = padding
    if (position.value.y < padding) position.value.y = padding
  }

  const onWindowResize = () => {
    adjustBounds()
  }

  onMounted(() => {
    adjustBounds()
    window.addEventListener('resize', onWindowResize)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('mousemove', onDrag)
    document.removeEventListener('mouseup', stopDrag)
    window.removeEventListener('resize', onWindowResize)
  })

  return {
    position,
    dimensions,
    startDrag,
  }
}
