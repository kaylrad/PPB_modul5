import { useState } from 'react'
import { itemUrl } from '../../utils/routes'
export default function ItemShare({ item }) {
  const [link, setLink] = useState('')
  const [message, setMessage] = useState('')
  async function share(event) {
    event.stopPropagation()
    try {
      const url = itemUrl(window.location.href, item.id)
      setLink(url)
      setMessage('Tautan siap disalin.')
      try { await navigator.clipboard.writeText(url); setMessage('Link disalin.') }
      catch { setMessage('Salin tautan dari kolom berikut.') }
    } catch (error) { setMessage(error.message || 'Link tidak dapat dibagikan.') }
  }
  return <span className="item-share">
    <button type="button" className="btn btn--outline btn--sm" onClick={share} disabled={item.id == null || String(item.id).startsWith('local-')}>Share</button>
    {link && <span className="item-share__link"><input aria-label="Tautan detail" readOnly value={link}/><a href={link} target="_blank" rel="noopener noreferrer">Buka tautan</a></span>}
    <span role="status">{message}</span>
  </span>
}
