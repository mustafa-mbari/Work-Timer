import { requireAdmin } from '@/lib/services/auth'
import UITestLab from './UITestLab'

export default async function UITestPage() {
  await requireAdmin()
  return <UITestLab />
}
