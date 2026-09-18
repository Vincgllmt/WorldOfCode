import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import toast from 'react-hot-toast'
import { MessageInput } from '@/components/message/MessageInput'
import { socket } from '@/lib/socket'
import { uploadImage } from '@/services/uploadService'
import { checkImageNSFW, getNsfwBlockMessage } from '@/services/nsfwService'
import { MAX_IMAGE_SIZE_BYTES } from '@/config/upload'

jest.mock('@/lib/socket', () => ({
  socket: { emit: jest.fn() },
}))
jest.mock('@/services/uploadService', () => ({
  uploadImage: jest.fn(),
}))
jest.mock('@/services/nsfwService', () => ({
  checkImageNSFW: jest.fn(),
  getNsfwBlockMessage: jest.fn(() => 'Image refusée : contenu inapproprié détecté.'),
}))
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    success: jest.fn(),
    loading: jest.fn(() => 'toast-id'),
    dismiss: jest.fn(),
  },
}))
jest.mock('@/components/message/EmojiPicker', () => ({
  __esModule: true,
  default: ({ onSelect }: { onSelect: (emoji: string) => void }) => (
    <div data-testid="emoji-picker">
      <button type="button" onClick={() => onSelect('😀')}>😀</button>
    </div>
  ),
}))

const mockedUploadImage = uploadImage as jest.MockedFunction<typeof uploadImage>
const mockedCheckNsfw = checkImageNSFW as jest.MockedFunction<typeof checkImageNSFW>
const mockedSocketEmit = socket.emit as jest.Mock
const mockedToastError = toast.error as jest.Mock

function makeImageFile(name = 'photo.png', size = 1024, type = 'image/png'): File {
  const file = new File([new Uint8Array(size)], name, { type })
  return file
}

function makeZipFile(name = 'archive.zip', size = 1024, type = 'application/zip'): File {
  return new File([new Uint8Array(size)], name, { type })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockedCheckNsfw.mockResolvedValue({ blocked: false, predictions: [] })
  global.URL.createObjectURL = jest.fn(() => 'blob:preview')
  global.URL.revokeObjectURL = jest.fn()
})

describe('MessageInput', () => {
  it('envoie un message texte et vide le champ', async () => {
    const onSend = jest.fn()
    const user = userEvent.setup()
    render(<MessageInput onSend={onSend} conversationId="conv-1" />)

    const input = screen.getByPlaceholderText('Écrire un message...')
    await user.type(input, 'Salut{Enter}')

    expect(onSend).toHaveBeenCalledWith('Salut')
    expect(input).toHaveValue('')
  })

  it('envoie via le bouton et désactive le bouton quand le champ est vide', async () => {
    const onSend = jest.fn()
    const user = userEvent.setup()
    render(<MessageInput onSend={onSend} />)

    // Le bouton d'envoi est le dernier bouton du panneau.
    const buttons = screen.getAllByRole('button')
    const send = buttons[buttons.length - 1]
    expect(send).toBeDisabled()

    await user.type(screen.getByPlaceholderText('Écrire un message...'), 'Coucou')
    expect(send).toBeEnabled()
    await user.click(send)
    expect(onSend).toHaveBeenCalledWith('Coucou')
  })

  it('émet les évènements de frappe puis les arrête à l\'envoi', async () => {
    const onSend = jest.fn()
    const user = userEvent.setup()
    render(<MessageInput onSend={onSend} conversationId="conv-1" />)

    await user.type(screen.getByPlaceholderText('Écrire un message...'), 'a')
    expect(mockedSocketEmit).toHaveBeenCalledWith('typing', { conversation_id: 'conv-1', is_typing: true })

    await user.keyboard('{Enter}')
    expect(mockedSocketEmit).toHaveBeenCalledWith('typing', { conversation_id: 'conv-1', is_typing: false })
  })

  it('ouvre le picker emoji et insère un emoji sélectionné', async () => {
    const user = userEvent.setup()
    render(<MessageInput onSend={jest.fn()} />)

    await user.click(screen.getAllByRole('button')[0])
    expect(screen.getByTestId('emoji-picker')).toBeInTheDocument()

    await user.click(screen.getByText('😀'))

    expect(screen.getByPlaceholderText('Écrire un message...')).toHaveValue('😀')
    expect(screen.queryByTestId('emoji-picker')).not.toBeInTheDocument()
  })

  it('ajoute une image valide, l\'affiche en aperçu puis l\'envoie', async () => {
    mockedUploadImage.mockResolvedValueOnce({ url: 'https://cdn.test/photo.png' } as any)
    const onSend = jest.fn()
    const { container } = render(<MessageInput onSend={onSend} />)

    const fileInput = container.querySelector('input[type="file"][accept*="image"]') as HTMLInputElement
    const file = makeImageFile()
    await userEvent.upload(fileInput, file)

    expect(await screen.findByAltText('Aperçu 1')).toBeInTheDocument()

    const buttons = screen.getAllByRole('button')
    await userEvent.click(buttons[buttons.length - 1])

    await waitFor(() => expect(mockedUploadImage).toHaveBeenCalledWith(file))
    expect(onSend).toHaveBeenCalledWith('https://cdn.test/photo.png', 'image')
  })

  it('rejette une image trop volumineuse', async () => {
    const { container } = render(<MessageInput onSend={jest.fn()} />)
    const fileInput = container.querySelector('input[type="file"][accept*="image"]') as HTMLInputElement
    const bigFile = makeImageFile('big.png', MAX_IMAGE_SIZE_BYTES + 1)

    await userEvent.upload(fileInput, bigFile)

    expect(mockedToastError).toHaveBeenCalledWith(expect.stringContaining('dépasse'))
    expect(screen.queryByAltText('Aperçu 1')).not.toBeInTheDocument()
  })

  it('rejette une image détectée NSFW', async () => {
    mockedCheckNsfw.mockResolvedValueOnce({ blocked: true, reason: 'Porn', predictions: [] })
    const { container } = render(<MessageInput onSend={jest.fn()} />)
    const fileInput = container.querySelector('input[type="file"][accept*="image"]') as HTMLInputElement

    await userEvent.upload(fileInput, makeImageFile())

    await waitFor(() => expect(mockedToastError).toHaveBeenCalledWith(expect.stringContaining('contenu inapproprié')))
    expect(screen.queryByAltText('Aperçu 1')).not.toBeInTheDocument()
  })

  it('supprime une image ajoutée avant envoi', async () => {
    const { container } = render(<MessageInput onSend={jest.fn()} />)
    const fileInput = container.querySelector('input[type="file"][accept*="image"]') as HTMLInputElement
    await userEvent.upload(fileInput, makeImageFile())
    await screen.findByAltText('Aperçu 1')

    const removeButtons = screen.getAllByRole('button').filter(b => b.querySelector('svg.lucide-x'))
    await userEvent.click(removeButtons[0])

    expect(screen.queryByAltText('Aperçu 1')).not.toBeInTheDocument()
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview')
  })

  it('ajoute un fichier zip valide et l\'envoie avec son nom/taille', async () => {
    mockedUploadImage.mockResolvedValueOnce({ url: 'https://cdn.test/archive.zip' } as any)
    const onSend = jest.fn()
    const { container } = render(<MessageInput onSend={onSend} />)

    const zipInput = container.querySelector('input[type="file"]:not([accept*="image"])') as HTMLInputElement
    const zip = makeZipFile('mon-projet.zip', 2048)
    await userEvent.upload(zipInput, zip)

    expect(screen.getByText('mon-projet.zip')).toBeInTheDocument()
    expect(screen.getByText('2.0 Ko')).toBeInTheDocument()

    const buttons = screen.getAllByRole('button')
    await userEvent.click(buttons[buttons.length - 1])

    await waitFor(() => expect(mockedUploadImage).toHaveBeenCalledWith(zip))
    expect(onSend).toHaveBeenCalledWith(
      JSON.stringify({ url: 'https://cdn.test/archive.zip', name: 'mon-projet.zip', size: 2048 }),
      'file',
    )
  })

  it('rejette un fichier qui n\'est pas un zip', async () => {
    const { container } = render(<MessageInput onSend={jest.fn()} />)
    const zipInput = container.querySelector('input[type="file"]:not([accept*="image"])') as HTMLInputElement
    const notZip = new File(['x'], 'doc.txt', { type: 'text/plain' })

    // `userEvent.upload` filtre selon l'attribut `accept` de l'input ; on passe par
    // `fireEvent` pour vérifier la validation applicative elle-même (défense en profondeur).
    fireEvent.change(zipInput, { target: { files: [notZip] } })

    expect(mockedToastError).toHaveBeenCalledWith('Seuls les fichiers .zip sont acceptés.')
    expect(screen.queryByText('doc.txt')).not.toBeInTheDocument()
  })

  it('affiche un overlay lors du glisser-déposer et importe les fichiers déposés', async () => {
    const { container } = render(<MessageInput onSend={jest.fn()} />)
    const dropZone = container.firstChild as HTMLElement

    const file = makeImageFile()
    const dataTransfer = { types: ['Files'], files: [file] }

    fireEvent.dragEnter(dropZone, { dataTransfer })

    expect(await screen.findByText('Déposez vos fichiers ici')).toBeInTheDocument()

    fireEvent.drop(dropZone, { dataTransfer })

    expect(screen.queryByText('Déposez vos fichiers ici')).not.toBeInTheDocument()
    expect(await screen.findByAltText('Aperçu 1')).toBeInTheDocument()
  })

  it('colle une image depuis le presse-papier', async () => {
    const file = makeImageFile('clipboard.png')
    render(<MessageInput onSend={jest.fn()} />)

    const input = screen.getByPlaceholderText('Écrire un message...')
    fireEvent.paste(input, {
      clipboardData: { items: [{ type: 'image/png', getAsFile: () => file }] },
    })

    expect(await screen.findByAltText('Aperçu 1')).toBeInTheDocument()
  })
})
