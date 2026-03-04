import { useVirtualizer } from '@tanstack/react-virtual'
import {
  type DetailedHTMLProps,
  type HTMLAttributes,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { DragDropProvider } from '@dnd-kit/react'
import { isSortable, useSortable } from '@dnd-kit/react/sortable'
import { move } from '@dnd-kit/helpers'
import { queueMarkAsSelected, fetchMore, queueAdd, queueSwap } from './requests.ts'

export interface Row {
  id: number
}

export default function App() {
  const [optimisticSelects, setOptimisticSelects] = useState<Row[]>([])
  const { rows: loadedRows, ...selectedRowsData } = useRows({
    selected: true,
    extraCount: optimisticSelects.length,
  })

  const selectedRows = useMemo(
    () => [...loadedRows, ...optimisticSelects],
    [loadedRows, optimisticSelects]
  )

  return (
    <div className='grid grid-cols-2 gap-15 mx-80 my-20'>
      <AllRows
        onRowClick={(id) => {
          queueMarkAsSelected(id)
          // ideally should be cleared on request promise resolve/reject but its ok for now
          !loadedRows.find((row) => row.id === id) &&
            !optimisticSelects.find((row) => row.id === id) &&
            setOptimisticSelects((prev) => [...prev, { id }])
        }}
      />
      <SelectedRows {...selectedRowsData} rows={selectedRows} />
    </div>
  )
}

function AllRows({ onRowClick }: { onRowClick: (id: number) => void }) {
  const {
    rows: loadedRows,
    filterString,
    setFilterString,
    containerRef,
    virtualizer,
  } = useRows()

  const [optimisticAdds, setOptimisticAdds] = useState<Row[]>([])
  const rows = useMemo(
    () => [...loadedRows, ...optimisticAdds],
    [loadedRows, optimisticAdds]
  )

  const [newItemId, setNewItemId] = useState('')

  return (
    <div>
      <div className='flex flex-row gap-5'>
        <input
          type='text'
          placeholder='search'
          className='input mb-2 flex-2'
          value={filterString}
          onChange={(e) => setFilterString(e.target.value)}
        />
        <input
          type='text'
          placeholder='id of a new item'
          className='input mb-2 flex-1'
          value={newItemId}
          onChange={(e) => setNewItemId(e.target.value)}
        />
        <button
          className='btn'
          onClick={async () => {
            const newId = Number.parseInt(newItemId)
            if (Number.isNaN(newId)) {
              return alert('should be a number')
            }

            queueAdd(newId)
            !loadedRows.find((row) => row.id === newId) &&
              !optimisticAdds.find((row) => row.id === newId) &&
              setOptimisticAdds((prev) => [...prev, { id: newId }])
            setNewItemId('')
          }}
        >
          add
        </button>
      </div>
      {/* 'fix' for the header scrolling away, much crazier ideas that allow using one table: https://github.com/TanStack/virtual/issues/640 */}
      <table className='table table-pin-rows'>
        <thead>
          <tr>
            <th>id</th>
          </tr>
        </thead>
      </table>
      <div className='h-[700px] overflow-auto' ref={containerRef}>
        <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
          <table className='table table-zebra'>
            <tbody>
              {virtualizer.getVirtualItems().map((virtualRow, index) => {
                const isLoaderRow = virtualRow.index > rows.length - 1
                const row = rows[virtualRow.index]

                const style = {
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${
                    virtualRow.start - index * virtualRow.size
                  }px)`,
                }

                if (isLoaderRow) {
                  return (
                    <tr key={virtualRow.index} style={style}>
                      <td>Loading...</td>
                    </tr>
                  )
                }

                return (
                  <tr
                    key={virtualRow.index}
                    className='hover:bg-base-content/10 hover:cursor-pointer'
                    style={style}
                    onClick={() => onRowClick(row.id)}
                  >
                    <td>{row.id}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function SelectedRows({
  filterString,
  setFilterString,
  containerRef,
  virtualizer,
  rows,
}: ReturnType<typeof useRows>) {
  const [sortedRows, setSortedRows] = useState(rows)

  useEffect(() => {
    setSortedRows(rows)
  }, [setSortedRows, rows])

  return (
    <div>
      <div className='flex flex-row gap-5'>
        <input
          type='text'
          placeholder='search'
          className='input mb-2 flex-2'
          value={filterString}
          onChange={(e) => setFilterString(e.target.value)}
        />
      </div>
      {/* 'fix' for the header scrolling away, much crazier ideas that allow using one table: https://github.com/TanStack/virtual/issues/640 */}
      <table className='table table-pin-rows'>
        <thead>
          <tr>
            <th>id</th>
          </tr>
        </thead>
      </table>
      <div className='h-[700px] overflow-auto' ref={containerRef}>
        <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
          <table className='table table-zebra'>
            <DragDropProvider
              onDragEnd={(e) => {
                const { source } = e.operation

                if (!e.canceled && isSortable(source)) {
                  const from = source.sortable.initialIndex
                  const to = source.sortable.index

                  if (from !== to) {
                    queueSwap(sortedRows[from].id, sortedRows[to].id)
                  }
                }

                setSortedRows((prev) => move(prev, e))
              }}
            >
              <tbody>
                {virtualizer.getVirtualItems().map((virtualRow, index) => {
                  const isLoaderRow = virtualRow.index > sortedRows.length - 1
                  const row = sortedRows[virtualRow.index]

                  const style = {
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${
                      virtualRow.start - index * virtualRow.size
                    }px)`,
                  }

                  if (isLoaderRow) {
                    return (
                      <tr key={virtualRow.index} style={style}>
                        <td>Loading...</td>
                      </tr>
                    )
                  }

                  return (
                    <SortableTr
                      key={row.id}
                      className='hover:bg-base-content/10 hover:cursor-pointer'
                      style={style}
                      itemId={row.id}
                      index={virtualRow.index}
                    >
                      <td>{row.id}</td>
                    </SortableTr>
                  )
                })}
              </tbody>
            </DragDropProvider>
          </table>
        </div>
      </div>
    </div>
  )
}

function SortableTr({
  itemId,
  index,
  ...rest
}: DetailedHTMLProps<HTMLAttributes<HTMLTableRowElement>, HTMLTableRowElement> & {
  itemId: number
  index: number
}) {
  const { ref } = useSortable({ id: itemId, index })

  return <tr ref={ref} {...rest}></tr>
}

function useRows({
  selected = false,
  extraCount,
}: { selected?: boolean; extraCount?: number } = {}) {
  const [filterString, setFilterString] = useState('')
  const parsedFilter = filterString
    .replaceAll(/[,;]/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)

  const { data, isFetchingNextPage, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ['rows', selected, parsedFilter],
    queryFn: ({ pageParam }) =>
      fetchMore({ nextCursor: pageParam, filter: parsedFilter, selected }),
    getNextPageParam: ({ nextCursor }) => nextCursor,
    initialPageParam: undefined as undefined | number,
  })

  const rows = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data])

  const containerRef = useRef(null)
  const virtualizer = useVirtualizer({
    count: (hasNextPage ? rows.length + 1 : rows.length) + (extraCount ?? 0),
    getScrollElement: () => containerRef.current,
    estimateSize: () => 46,
    overscan: 10,
  })

  useEffect(() => {
    if (
      (virtualizer.getVirtualItems().at(-1)?.index ?? -1) >= rows.length - 1 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage()
    }
  }, [
    hasNextPage,
    fetchNextPage,
    rows.length,
    isFetchingNextPage,
    virtualizer.getVirtualItems(),
  ])

  return {
    filterString,
    setFilterString,
    containerRef,
    virtualizer,
    rows,
  }
}
