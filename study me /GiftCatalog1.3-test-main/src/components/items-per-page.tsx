'use client'

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAppState } from '@/lib/state'

export function ItemsPerPage() {
  const { state, dispatch } = useAppState()

  const handleItemsPerPageChange = (value: string) => {
    dispatch({ type: 'SET_ITEMS_PER_PAGE', payload: Number.parseInt(value) })
  }

  return (
    <Select onValueChange={handleItemsPerPageChange} defaultValue={state.itemsPerPage.toString()}>
      <SelectTrigger className="w-full bg-card text-foreground border border-border dark:border-border/30 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 transition-all duration-200 text-xs shadow-sm">
        <SelectValue placeholder="Items per page" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="12" className="text-xs">12 per page</SelectItem>
          <SelectItem value="24" className="text-xs">24 per page</SelectItem>
          <SelectItem value="48" className="text-xs">48 per page</SelectItem>
          <SelectItem value="96" className="text-xs">96 per page</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
