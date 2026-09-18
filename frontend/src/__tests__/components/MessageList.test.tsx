import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MessageList } from '@/components/message/MessageList'
import type { Message } from '@/interfaces/message'
import { confirmSessionSchedule, getSession } from '@/lib/api/mentoring/sessions'
import {
  confirmSessionAppointment,
  refuseSessionAppointment,
  getSessionAppointment,
} from '@/lib/api/mentoring/appointments'
import { getSessionRatings } from '@/lib/api/mentoring/ratings'
import { getSessionDonationStatus } from '@/lib/api/payment'

jest.mock('@/lib/api/mentoring/sessions', () => ({
  confirmSessionSchedule: jest.fn(),
  getSession: jest.fn(),
}))
jest.mock('@/lib/api/mentoring/appointments', () => ({
  confirmSessionAppointment: jest.fn(),
  refuseSessionAppointment: jest.fn(),
  getSessionAppointment: jest.fn(),
}))
jest.mock('@/lib/api/mentoring/ratings', () => ({
  getSessionRatings: jest.fn(),
}))
jest.mock('@/lib/api/payment', () => ({
  getSessionDonationStatus: jest.fn(),
}))

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// jsdom ne calcule aucune taille réelle pour le conteneur scrollable : le
// virtualizer déciderait qu'aucun item n'est visible. On le remplace par une
// implémentation triviale qui rend tous les messages, ce qui suffit puisque
// ces tests portent sur le rendu par message, pas sur la virtualisation.
jest.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getTotalSize: () => count * 60,
    getVirtualItems: () => Array.from({ length: count }, (_, index) => ({ index, start: index * 60, key: index })),
    scrollToIndex: jest.fn(),
    measureElement: () => {},
  }),
}))

jest.mock('@/components/mentoring/session/RatingModal', () => ({
  __esModule: true,
  default: ({ onClose, onSubmitted, onDonate, canDonate }: { onClose: () => void; onSubmitted: () => void; onDonate?: () => void; canDonate?: boolean }) => (
    <div data-testid="rating-modal">
      <button type="button" onClick={onSubmitted}>Envoyer la note</button>
      {canDonate && <button type="button" onClick={onDonate}>Passer au don</button>}
      <button type="button" onClick={onClose}>Fermer notation</button>
    </div>
  ),
}))
jest.mock('@/components/mentoring/session/DonationModal', () => ({
  __esModule: true,
  default: ({ onClose, onDonated }: { onClose: () => void; onDonated: () => void }) => (
    <div data-testid="donation-modal">
      <button type="button" onClick={onDonated}>Confirmer le don</button>
      <button type="button" onClick={onClose}>Fermer don</button>
    </div>
  ),
}))
jest.mock('@/components/mentoring/request/CounterProposalModal', () => ({
  __esModule: true,
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="counter-proposal-modal">
      <button type="button" onClick={onClose}>Fermer contre-proposition</button>
    </div>
  ),
}))
jest.mock('@/components/mentoring/cockpit/ProposeDateModal', () => ({
  __esModule: true,
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="propose-date-modal">
      <button type="button" onClick={onClose}>Fermer proposition</button>
    </div>
  ),
}))

const mockedConfirmSchedule = confirmSessionSchedule as jest.MockedFunction<typeof confirmSessionSchedule>
const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockedConfirmAppt = confirmSessionAppointment as jest.MockedFunction<typeof confirmSessionAppointment>
const mockedRefuseAppt = refuseSessionAppointment as jest.MockedFunction<typeof refuseSessionAppointment>
const mockedGetAppt = getSessionAppointment as jest.MockedFunction<typeof getSessionAppointment>
const mockedGetRatings = getSessionRatings as jest.MockedFunction<typeof getSessionRatings>
const mockedGetDonationStatus = getSessionDonationStatus as jest.MockedFunction<typeof getSessionDonationStatus>

function makeMessage(overrides: Partial<Message>): Message {
  return {
    id: 'm1',
    conversationId: 'conv-1',
    body: 'Salut',
    type: 'text',
    read: true,
    sender: { id: 1, username: 'alice' },
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockedGetSession.mockResolvedValue({ scheduledAt: null } as any)
  mockedGetAppt.mockResolvedValue({ status: 'pending' } as any)
  mockedGetRatings.mockResolvedValue({ hasRated: false })
  mockedGetDonationStatus.mockResolvedValue({ mentorReady: false, payment: null })
  global.URL.createObjectURL = jest.fn(() => 'blob:mock')
  global.URL.revokeObjectURL = jest.fn()
  global.fetch = jest.fn(() =>
    Promise.resolve({ blob: () => Promise.resolve(new Blob(['x'], { type: 'image/png' })) } as Response),
  )
})

describe('MessageList', () => {
  it("affiche un état vide quand il n'y a aucun message", () => {
    render(<MessageList messages={[]} userId="1" />)
    expect(screen.getByText('Aucun message pour le moment')).toBeInTheDocument()
  })

  it('affiche un message texte sanitizé avec son heure', () => {
    render(<MessageList messages={[makeMessage({ body: '<b>Salut</b> <script>bad()</script>' })]} userId="1" />)
    const bold = screen.getByText('Salut', { selector: 'b' })
    expect(bold).toBeInTheDocument()
    expect(document.querySelector('script')).not.toBeInTheDocument()
  })

  it('affiche le séparateur "Aujourd\'hui" pour un message du jour', () => {
    render(<MessageList messages={[makeMessage({ createdAt: new Date().toISOString() })]} userId="1" />)
    expect(screen.getByText("Aujourd'hui")).toBeInTheDocument()
  })

  it('affiche le séparateur "Hier" pour un message de la veille', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    render(<MessageList messages={[makeMessage({ createdAt: yesterday })]} userId="1" />)
    expect(screen.getByText('Hier')).toBeInTheDocument()
  })

  it('affiche le nom expéditeur dans une conversation de groupe', () => {
    render(
      <MessageList
        messages={[makeMessage({ sender: { id: 2, username: 'bob' } })]}
        userId="1"
        convType="group"
      />,
    )
    expect(screen.getByText('bob')).toBeInTheDocument()
  })

  it('formate les textes des appels manqués selon la raison et l\'auteur', () => {
    render(
      <MessageList
        messages={[
          makeMessage({ id: 'c1', type: 'missed_call', body: 'rejected', sender: { id: 2, username: 'bob' } }),
        ]}
        userId="1"
      />,
    )
    expect(screen.getByText('Appel de bob refusé')).toBeInTheDocument()
  })

  it('affiche "Appel refusé" quand je suis à l\'origine de l\'appel manqué refusé', () => {
    render(
      <MessageList
        messages={[makeMessage({ id: 'c2', type: 'missed_call', body: 'timeout', sender: { id: 1, username: 'me' } })]}
        userId="1"
      />,
    )
    expect(screen.getByText('Appel sans réponse')).toBeInTheDocument()
  })

  it('affiche un message d\'appel normal', () => {
    render(
      <MessageList
        messages={[makeMessage({ id: 'c3', type: 'call', body: 'Appel terminé (2:15)' })]}
        userId="1"
      />,
    )
    expect(screen.getByText('Appel terminé (2:15)')).toBeInTheDocument()
  })

  it('affiche une image et ouvre la visionneuse au clic', async () => {
    const user = userEvent.setup()
    render(
      <MessageList
        messages={[makeMessage({ id: 'img1', type: 'image', body: 'https://cdn.test/photo.png' })]}
        userId="1"
      />,
    )
    await user.click(screen.getByAltText('Image partagée'))
    expect(screen.getByAltText('Image en grand')).toBeInTheDocument()
  })

  it('affiche un fichier avec sa taille formatée et déclenche le téléchargement au clic', async () => {
    const user = userEvent.setup()
    const fileBody = JSON.stringify({ url: 'https://cdn.test/doc.pdf', name: 'doc.pdf', size: 1536 })
    render(<MessageList messages={[makeMessage({ id: 'f1', type: 'file', body: fileBody })]} userId="1" />)

    expect(screen.getByText('doc.pdf')).toBeInTheDocument()
    expect(screen.getByText(/1\.5 Ko/)).toBeInTheDocument()

    await user.click(screen.getByText('doc.pdf'))
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('https://cdn.test/doc.pdf'))
  })

  it('affiche les utilisateurs en train de taper', () => {
    render(<MessageList messages={[makeMessage({})]} userId="1" typingUsers={['bob']} />)
    expect(screen.getByText("est en train d'écrire")).toBeInTheDocument()
  })

  it('intercepte les clics sur les liens internes pour naviguer côté client', async () => {
    const user = userEvent.setup()
    render(
      <MessageList
        messages={[makeMessage({ body: '<a href="/post/42">Voir le post</a>' })]}
        userId="1"
      />,
    )
    await user.click(screen.getByRole('link', { name: 'Voir le post' }))
    expect(mockPush).toHaveBeenCalledWith('/post/42')
  })

  describe('proposition de session', () => {
    const proposalBody = JSON.stringify({
      sessionId: 55,
      proposedAt: '2026-03-01T10:00:00Z',
      display: '1 mars à 10h00',
      note: 'Format vidéo',
    })

    it("affiche une proposition en attente et permet de l'accepter", async () => {
      mockedConfirmSchedule.mockResolvedValueOnce({} as any)
      const user = userEvent.setup()
      render(
        <MessageList
          messages={[makeMessage({ id: 'p1', type: 'session_proposal', body: proposalBody, sender: { id: 2, username: 'bob' } })]}
          userId="1"
          conversationId="conv-1"
        />,
      )

      expect(await screen.findByText('Proposition de session')).toBeInTheDocument()
      expect(screen.getByText('1 mars à 10h00')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /Accepter/i }))

      await waitFor(() => expect(mockedConfirmSchedule).toHaveBeenCalledWith(55, '2026-03-01T10:00:00Z'))
    })

    it("n'affiche pas d'action sur sa propre proposition", async () => {
      render(
        <MessageList
          messages={[makeMessage({ id: 'p2', type: 'session_proposal', body: proposalBody, sender: { id: 1, username: 'me' } })]}
          userId="1"
        />,
      )
      expect(await screen.findByText('Proposition de session envoyée')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Accepter/i })).not.toBeInTheDocument()
    })

    it('affiche "Confirmé" quand la date proposée est celle retenue par la session', async () => {
      mockedGetSession.mockResolvedValue({ scheduledAt: '2026-03-01T10:00:00Z' } as any)
      render(
        <MessageList
          messages={[makeMessage({ id: 'p3', type: 'session_proposal', body: proposalBody, sender: { id: 2, username: 'bob' } })]}
          userId="1"
        />,
      )
      expect(await screen.findByText('Confirmé')).toBeInTheDocument()
    })

    it('ouvre la contre-proposition depuis une proposition de session', async () => {
      const user = userEvent.setup()
      render(
        <MessageList
          messages={[makeMessage({ id: 'p4', type: 'session_proposal', body: proposalBody, sender: { id: 2, username: 'bob' } })]}
          userId="1"
          conversationId="conv-1"
        />,
      )
      await user.click(await screen.findByRole('button', { name: /Autre date/i }))
      expect(screen.getByTestId('counter-proposal-modal')).toBeInTheDocument()
    })
  })

  describe('contre-proposition de date', () => {
    const counterBody = JSON.stringify({
      sessionId: 66,
      proposedAt: '2026-03-02T11:00:00Z',
      display: '2 mars à 11h00',
      note: null,
    })

    it('affiche la contre-proposition et permet de la confirmer', async () => {
      mockedConfirmSchedule.mockResolvedValueOnce({} as any)
      const user = userEvent.setup()
      render(
        <MessageList
          messages={[makeMessage({ id: 'cp1', type: 'session_counter_proposal', body: counterBody, sender: { id: 2, username: 'bob' } })]}
          userId="1"
          conversationId="conv-1"
          otherUsername="bob"
        />,
      )
      expect(await screen.findByText('Contre-proposition de date')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /Confirmer/i }))

      await waitFor(() => expect(mockedConfirmSchedule).toHaveBeenCalledWith(66, '2026-03-02T11:00:00Z'))
    })

    it('ouvre une reproposition de date depuis une contre-proposition', async () => {
      const user = userEvent.setup()
      render(
        <MessageList
          messages={[makeMessage({ id: 'cp2', type: 'session_counter_proposal', body: counterBody, sender: { id: 2, username: 'bob' } })]}
          userId="1"
          conversationId="conv-1"
        />,
      )
      await user.click(await screen.findByRole('button', { name: /Autre date/i }))
      expect(screen.getByTestId('propose-date-modal')).toBeInTheDocument()
    })
  })

  describe('proposition de rendez-vous', () => {
    const apptBody = JSON.stringify({
      sessionId: 77,
      appointmentId: 900,
      proposedAt: '2026-03-03T09:00:00Z',
      display: '3 mars à 9h00',
    })

    it('affiche une proposition de rendez-vous en attente et permet accepter/refuser', async () => {
      mockedGetAppt.mockResolvedValue({ status: 'pending' } as any)
      mockedConfirmAppt.mockResolvedValueOnce({} as any)
      const user = userEvent.setup()
      render(
        <MessageList
          messages={[makeMessage({ id: 'a1', type: 'appointment_proposal', body: apptBody, sender: { id: 2, username: 'bob' } })]}
          userId="1"
          conversationId="conv-1"
        />,
      )
      expect(await screen.findByText('Proposition de rendez-vous')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /Accepter/i }))

      await waitFor(() => expect(mockedConfirmAppt).toHaveBeenCalledWith(77, 900))
      expect(await screen.findByText('Confirmé')).toBeInTheDocument()
    })

    it('permet de refuser une proposition de rendez-vous', async () => {
      mockedGetAppt.mockResolvedValue({ status: 'pending' } as any)
      mockedRefuseAppt.mockResolvedValueOnce({} as any)
      const user = userEvent.setup()
      render(
        <MessageList
          messages={[makeMessage({ id: 'a2', type: 'appointment_proposal', body: apptBody, sender: { id: 2, username: 'bob' } })]}
          userId="1"
          conversationId="conv-1"
        />,
      )
      await user.click(await screen.findByRole('button', { name: /Refuser/i }))

      await waitFor(() => expect(mockedRefuseAppt).toHaveBeenCalledWith(77, 900))
      expect(await screen.findByText('Refusé')).toBeInTheDocument()
    })

    it("affiche « Accepté par le junior » côté auteur quand c'est confirmé", async () => {
      mockedGetAppt.mockResolvedValue({ status: 'confirmed' } as any)
      render(
        <MessageList
          messages={[makeMessage({ id: 'a3', type: 'appointment_proposal', body: apptBody, sender: { id: 1, username: 'me' } })]}
          userId="1"
        />,
      )
      expect(await screen.findByText('Accepté par le junior')).toBeInTheDocument()
    })
  })

  describe('session terminée', () => {
    const closedBody = JSON.stringify({
      sessionId: 88,
      mentorId: 2,
      mentorUsername: 'mentorBob',
      juniorId: 1,
      juniorUsername: 'junior1',
    })

    it('propose de noter la session puis affiche la confirmation', async () => {
      const user = userEvent.setup()
      render(
        <MessageList
          messages={[makeMessage({ id: 's1', type: 'session_closed', body: closedBody, sender: { id: 2, username: 'bob' } })]}
          userId="1"
        />,
      )
      await user.click(await screen.findByRole('button', { name: 'Noter' }))
      expect(screen.getByTestId('rating-modal')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Envoyer la note' }))
      expect(await screen.findByText('Note envoyée')).toBeInTheDocument()
    })

    it('propose de soutenir le mentor quand celui-ci est prêt à recevoir des dons', async () => {
      mockedGetDonationStatus
        .mockResolvedValueOnce({ mentorReady: true, payment: null })
        .mockResolvedValueOnce({
          mentorReady: true,
          payment: { status: 'succeeded', amount: 500, currency: 'eur', createdAt: new Date().toISOString() },
        })
      const user = userEvent.setup()
      render(
        <MessageList
          messages={[makeMessage({ id: 's2', type: 'session_closed', body: closedBody, sender: { id: 2, username: 'bob' } })]}
          userId="1"
        />,
      )
      await user.click(await screen.findByRole('button', { name: 'Soutenir votre mentor' }))
      expect(screen.getByTestId('donation-modal')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Confirmer le don' }))
      expect(await screen.findByText('Don envoyé — merci !')).toBeInTheDocument()
    })

    it("n'affiche pas les actions de don côté mentor", async () => {
      mockedGetDonationStatus.mockResolvedValue({ mentorReady: true, payment: null })
      render(
        <MessageList
          messages={[makeMessage({ id: 's3', type: 'session_closed', body: closedBody, sender: { id: 2, username: 'mentorBob' } })]}
          userId="2"
        />,
      )
      await screen.findByText('Session terminée')
      expect(screen.queryByRole('button', { name: /Soutenir/i })).not.toBeInTheDocument()
    })
  })
})
