import { requireAdminPage } from '@/lib/services/auth'
import UITestLab from './UITestLab'

export default async function UITestPage() {
  await requireAdminPage()
  return <UITestLab />
}
