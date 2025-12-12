import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import Page from './page'

global.crypto = {
  randomUUID: () => Math.random().toString(36),
} as any

jest.mock('../api/gen/src', () => ({
  CalendarApi: jest.fn().mockImplementation(() => ({
    calendarControllerGenerateDemoCalendarV1: jest.fn().mockResolvedValue({
      success: true,
      calendar: {
        id: 'cal_123',
        weekStartDate: '2025-01-06',
        weekEndDate: '2025-01-12',
        campaignId: 'test',
        entries: [],
        metadata: { totalPosts: 3, qualityScore: 0.85, diversityScore: 0.9 },
        status: 'approved',
        createdAt: '2025-01-06',
        updatedAt: '2025-01-06'
      },
      generationTimeMs: 5000,
      errors: [],
      warnings: []
    }),
    calendarControllerGenerateCalendarV1: jest.fn().mockResolvedValue({
      success: true,
      calendar: null,
      generationTimeMs: 3000,
      errors: [],
      warnings: []
    })
  })),
  Configuration: jest.fn(),
  PersonaDtoToneEnum: {
    casual: 'casual',
    friendly: 'friendly',
    professional: 'professional'
  },
  PersonaWritingStyleDtoSentenceLengthEnum: {
    short: 'short',
    medium: 'medium',
    long: 'long'
  },
  PersonaWritingStyleDtoFormalityEnum: {
    casual: 'casual',
    neutral: 'neutral',
    formal: 'formal'
  }
}))

describe('Page', () => {
  it('renders without crashing', () => {
    render(<Page />)
    expect(screen.getByText(/Reddit Mastermind/i)).toBeInTheDocument()
  })

  it('displays demo and custom tabs', () => {
    render(<Page />)
    expect(screen.getByText('Demo Calendar')).toBeInTheDocument()
    expect(screen.getByText('Custom Calendar')).toBeInTheDocument()
  })

  it('switches between demo and custom tabs', () => {
    render(<Page />)
    
    const customButton = screen.getByText('Custom Calendar')
    fireEvent.click(customButton)
    
    expect(screen.getByText('Company Information')).toBeInTheDocument()
    
    const demoButton = screen.getByText('Demo Calendar')
    fireEvent.click(demoButton)
    
    expect(screen.getByText('Generate Demo Calendar (SlideForge)')).toBeInTheDocument()
  })

  it('handles demo calendar generation', async () => {
    render(<Page />)
    
    const generateButton = screen.getByText('Generate Demo Calendar')
    fireEvent.click(generateButton)
    
    await waitFor(() => {
      expect(screen.getByText(/Calendar generated successfully/i)).toBeInTheDocument()
    })
  })

  it('allows adding personas in custom form', () => {
    render(<Page />)
    
    fireEvent.click(screen.getByText('Custom Calendar'))
    
    const addPersonaButton = screen.getByText('+ Add Persona')
    fireEvent.click(addPersonaButton)
    
    expect(screen.getByText('Persona 3')).toBeInTheDocument()
  })

  it('allows removing personas when more than 2', () => {
    render(<Page />)
    
    fireEvent.click(screen.getByText('Custom Calendar'))
    
    const addPersonaButton = screen.getByText('+ Add Persona')
    fireEvent.click(addPersonaButton)
    
    const removeButtons = screen.getAllByText('Remove')
    expect(removeButtons.length).toBeGreaterThan(0)
  })

  it('allows adding and removing subreddits', () => {
    render(<Page />)
    
    fireEvent.click(screen.getByText('Custom Calendar'))
    
    const addSubredditButton = screen.getByText('+ Add Subreddit')
    fireEvent.click(addSubredditButton)
    
    expect(screen.getByText('Subreddit 2')).toBeInTheDocument()
  })

  it('allows adding and removing keywords', () => {
    render(<Page />)
    
    fireEvent.click(screen.getByText('Custom Calendar'))
    
    const addKeywordButton = screen.getByText('+ Add Keyword')
    fireEvent.click(addKeywordButton)
    
    const removeButtons = screen.getAllByText('✕')
    expect(removeButtons.length).toBeGreaterThan(0)
  })

  it('updates company name input', () => {
    render(<Page />)
    
    fireEvent.click(screen.getByText('Custom Calendar'))
    
    const input = screen.getByPlaceholderText('e.g., SlideForge') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'TestCompany' } })
    
    expect(input.value).toBe('TestCompany')
  })

  it('updates posts per week input', () => {
    render(<Page />)
    
    fireEvent.click(screen.getByText('Custom Calendar'))
    
    const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[]
    const postsPerWeekInput = inputs.find(input => 
      input.getAttribute('min') === '1' && input.getAttribute('max') === '10' && input.value === '3'
    )
    
    expect(postsPerWeekInput).toBeDefined()
    if (postsPerWeekInput) {
      fireEvent.change(postsPerWeekInput, { target: { value: '5' } })
      expect(postsPerWeekInput.value).toBe('5')
    }
  })

  it('handles custom calendar generation', async () => {
    render(<Page />)
    
    fireEvent.click(screen.getByText('Custom Calendar'))
    
    const generateButton = screen.getByText('Generate Custom Calendar')
    fireEvent.click(generateButton)
    
    await waitFor(() => {
      expect(screen.getByText('Generating...')).toBeInTheDocument()
    })
  })
})

