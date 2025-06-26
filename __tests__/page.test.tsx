import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import Home from '../app/page'

describe('Home Component', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
  })

  it('renders the main chat interface', () => {
    render(<Home />)
    expect(screen.getByText('Previous Chats')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument()
  })

  it('creates a new chat when clicking the plus button', () => {
    render(<Home />)
    const plusButton = screen.getByRole('button', { name: '' }) // The FaPlus icon button
    fireEvent.click(plusButton)
    expect(screen.getByText('Chat 1')).toBeInTheDocument()
  })

  it('disables input when no chat is selected', () => {
    render(<Home />)
    const input = screen.getByPlaceholderText('Type your message...')
    expect(input).toBeDisabled()
  })
}) 