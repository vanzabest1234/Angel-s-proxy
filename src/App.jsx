import { DesktopProvider } from './lib/store.jsx'
import Desktop from './desktop/Desktop.jsx'

export default function App() {
  return (
    <DesktopProvider>
      <Desktop />
    </DesktopProvider>
  )
}
