import { marked, type MarkedOptions } from 'marked'
import DOMPurify from 'dompurify'

// Configure marked for safe HTML
const markedOptions: MarkedOptions = {
  breaks: true, // Convert GFM line breaks to <br>
  gfm: true, // Use GitHub Flavored Markdown
}
marked.setOptions(markedOptions)

export function useMessageFormatter() {
  /**
   * Formats a message string using marked and DOMPurify.
   * Ensures that the input to marked() is always a string.
   * @param {string | unknown} textInput - The raw message text.
   * @param {boolean} isUserInput - Flag to determine if the input is from the user.
   * @returns {Promise<string>} The formatted and sanitized HTML string.
   */
  async function formatMessage(
    textInput: string | unknown,
    isUserInput = false,
  ): Promise<string> {
    let textToProcess: string

    if (Array.isArray(textInput)) {
      textToProcess = textInput.join(' ')
    } else if (typeof textInput === 'string') {
      textToProcess = textInput
    } else if (textInput === null || textInput === undefined) {
      textToProcess = ''
    } else {
      try {
        textToProcess = String(textInput)
      } catch {
        return '[Error: Invalid message format]'
      }
    }

    if (isUserInput) {
      // For user input, we only want to escape HTML and not process Markdown
      const escapedText = textToProcess
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
      // Sanitize even the escaped text to be absolutely sure, but with no HTML allowed.
      return DOMPurify.sanitize(escapedText, {
        USE_PROFILES: { html: false },
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
      })
    }

    // Ensure newlines are just \n for marked processing for bot messages
    textToProcess = textToProcess.replace(/\r\n/g, '\n')

    if (!textToProcess.trim()) {
      return '' // Return empty string if input is effectively empty after trim
    }

    try {
      // Process bot messages with marked and then sanitize
      const rawHtml = await Promise.resolve(marked(textToProcess))
      return DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } })
    } catch (error) {
      console.error('Error during message formatting:', error)
      // Fallback for safety: escape and return the original text if marked fails
      return textToProcess
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
    }
  }

  return {
    formatMessage,
  }
}
