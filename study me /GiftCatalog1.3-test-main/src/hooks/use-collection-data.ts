import useSWR from 'swr'
import { getCollectionData } from '@/lib/api'
import type { Filters, GiftCollectionData } from '@/lib/state'
import type { AttributeWithPercentage } from '@/lib/db'

interface UseCollectionDataOptions {
  giftName: string | undefined
  page?: number
  limit?: number
  filters?: Filters
  sort?: string
  includeAttributes?: boolean
  enabled?: boolean
}

export function useCollectionData({
  giftName,
  page = 1,
  limit = 12,
  filters = { attributes: {} },
  sort = 'id-asc',
  includeAttributes = true,
  enabled = true,
}: UseCollectionDataOptions) {
  const shouldFetch = Boolean(giftName) && enabled
  const key = shouldFetch
    ? [
        'collection-data',
        giftName,
        page,
        limit,
        JSON.stringify(filters),
        sort,
        includeAttributes,
      ]
    : null

  const { data, error, isLoading, mutate } = useSWR(
    key,
    () =>
      getCollectionData(
        giftName!,
        page,
        limit,
        filters,
        sort,
        includeAttributes
      ),
    {
      revalidateOnFocus: false,
      dedupingInterval: 1000 * 30, // 30 seconds
      keepPreviousData: true,
    }
  )

  return {
    data,
    error,
    isLoading,
    mutate,
  }
} 