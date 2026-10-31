import { useState, useSyncExternalStore, lazy, Suspense } from 'react'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import PWABadge from './components/PWABadge.jsx'
import ConfirmModal from './components/modals/ConfirmModal.jsx'
import SplashScreen from './components/common/SplashScreen.jsx'
import { useGunById } from './hooks/useGuns'
import { useAuth } from './hooks/useAuth'
import { setCatalogArchived } from './services/catalogArchiveService'
import { parseRoute, pageHash } from './utils/routes'
import './App.css'

const Catalog = lazy(() => import('./pages/Catalog.jsx'))
const FavoritesPage = lazy(() => import('./pages/FavoritesPage.jsx'))
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'))
const CreateGunPage = lazy(() => import('./pages/CreateGunPage.jsx'))
const EditGunPage = lazy(() => import('./pages/EditGunPage.jsx'))
const GunDetail = lazy(() => import('./components/gun/GunDetail.jsx'))
const EditProfilePage = lazy(() => import('./pages/EditProfilePage.jsx'))
const About = lazy(() => import('./pages/About.jsx'))
const Contact = lazy(() => import('./pages/Contact.jsx'))
const subscribe = fn => { window.addEventListener('hashchange', fn); return () => window.removeEventListener('hashchange', fn) }
const getHash = () => window.location.hash

function SharedDetail({ id, onBack, onEdit, onArchive }) {
  const { gun, loading, error, refetch } = useGunById(id)
  if (loading) return <p role="status">Memuat detail…</p>
  if (error || !gun) return <div className="state-box"><p role="alert">{error || 'Item tidak ditemukan.'}</p><button className="btn btn--outline" onClick={refetch}>Coba lagi</button><button className="btn btn--outline" onClick={onBack}>Kembali ke katalog</button></div>
  return <GunDetail key={id} gun={gun} onBack={onBack} onEdit={onEdit} onDelete={onArchive}/>
}

function Workspace({ route, onReplaySplash }) {
  const user = useAuth()
  const [mode, setMode] = useState('list')
  const [selected, setSelected] = useState(null)
  const [archiveTarget, setArchiveTarget] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const tab = route.kind === 'page' ? route.page : 'Catalog'
  function navigate(target, payload) {
    setError('')
    if (target === 'Create' || target === 'Edit') { setSelected(payload); setMode(target) }
    else if (target === 'Detail') {
      if (String(payload.id).startsWith('local-')) { setSelected(payload); setMode('localDetail') }
      else { setMode('list'); window.location.hash = 'item/' + encodeURIComponent(payload.id) }
    } else { setMode('list'); setSelected(null); window.location.hash = pageHash(target) }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const back = () => { setMode('list'); setSelected(null); if (route.kind !== 'page') navigate('Catalog') }
  const archive = item => { setError(''); setArchiveTarget(item) }
  return <>
    <Header tab={mode === 'list' && route.kind === 'page' ? tab : ''} onTab={navigate} onNavigateCreate={() => navigate('Create')}/>
    <main className="main"><Suspense fallback={<p role="status">Memuat halaman…</p>}>
      {mode === 'Create' ? <CreateGunPage onBack={back} onSuccess={() => navigate('Catalog')}/>
        : mode === 'Edit' ? <EditGunPage gun={selected} gunId={selected?.id} onBack={back} onSuccess={() => navigate('Catalog')}/>
        : mode === 'localDetail' ? <GunDetail gun={selected} onBack={back}/>
        : route.kind === 'invalid' ? <div className="state-box"><p role="alert">Tautan tidak valid.</p><button className="btn btn--outline" onClick={() => navigate('Catalog')}>Kembali ke katalog</button></div>
        : route.kind === 'item' ? <SharedDetail id={route.id} onBack={() => navigate('Catalog')} onEdit={g => navigate('Edit', g)} onArchive={archive}/>
        : tab === 'Catalog' ? <Catalog onNavigate={navigate}/>
        : tab === 'Favorites' ? <FavoritesPage onSelectGun={g => navigate('Detail', g)} onNavigateCatalog={() => navigate('Catalog')}/>
        : tab === 'Profile' ? <ProfilePage onNavigate={navigate} onReplaySplash={onReplaySplash}/>
        : tab === 'EditProfile' ? <EditProfilePage onBack={() => navigate('Profile')}/>
        : tab === 'About' ? <About/> : tab === 'Contact' ? <Contact/> : null}
    </Suspense></main>
    <ConfirmModal open={!!archiveTarget} title="Arsipkan dari katalog saya?" message={`“${archiveTarget?.name}” akan disembunyikan dari daftar Anda. Pulihkan melalui Profile → Arsip katalog saya.`} confirmLabel="Arsipkan" loading={busy} onCancel={() => setArchiveTarget(null)} onConfirm={async () => {
      if (!archiveTarget) return
      setBusy(true); setError('')
      try { await setCatalogArchived(archiveTarget, true, user?.id); setArchiveTarget(null); navigate('Catalog') }
      catch (e) { setError(e.message) } finally { setBusy(false) }
    }}/>
    {error && <p role="alert" className="toast toast--error">{error}</p>}
  </>
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true)
  const hash = useSyncExternalStore(subscribe, getHash, () => '')
  return <div className="shell">
    {showSplash && <SplashScreen onFinish={() => setShowSplash(false)}/>}
    <Workspace key={hash} route={parseRoute(hash)} onReplaySplash={() => setShowSplash(true)}/>
    <PWABadge/><Footer/>
  </div>
}
