'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import AdminUserPanel from '@/components/adminPanel/AdminUserPanel'
import AdminGroupPanel from '@/components/adminPanel/AdminGroupPanel'
import AdminPostPanel from '@/components/adminPanel/AdminPostPanel'

export default function AdminDashboardPage() {
  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>

      <Accordion type="multiple" className="w-full space-y-2">
        <AccordionItem value="groups" className='bg-red-50 rounded-sm px-2'>
          <AccordionTrigger>Gestion des Groupes</AccordionTrigger>
          <AccordionContent>
            <AdminGroupPanel />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="users" className='bg-blue-50 rounded-sm px-2'>
          <AccordionTrigger>Gestion des Utilisateurs</AccordionTrigger>
          <AccordionContent>
            <AdminUserPanel />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="posts" className='bg-green-50 rounded-sm px-2'>
          <AccordionTrigger>Gestion des Publications</AccordionTrigger>
          <AccordionContent>
            <AdminPostPanel />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
