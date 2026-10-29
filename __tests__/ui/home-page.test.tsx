import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import Page from '@/app/page'

describe('Home page', () => {
  it('renders the heading, the shorten form and a link to the url list', () => {
    render(<Page />)

    expect(screen.getByRole('heading', { level: 1, name: /encurtador de url/i })).toBeInTheDocument()
    expect(screen.getByRole('form', { name: /encurtar url/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /minhas urls/i })).toHaveAttribute('href', '/urls')
  })
})
