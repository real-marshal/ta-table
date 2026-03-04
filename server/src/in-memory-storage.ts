export class InMemoryStorage<T extends { id: number }> {
  private readonly data: T[]

  constructor(data: T[] = []) {
    this.data = data
  }

  insert(item: T) {
    if (this.data.find((it) => it.id === item.id)) return

    this.data.push(item)

    return item
  }

  selectMany({
    nextCursorId,
    limit,
    filter,
  }: {
    nextCursorId?: number
    limit: number
    filter?: number[]
  }) {
    const filteredData = filter
      ? this.data.filter((it) => filter?.includes(it.id))
      : this.data
    const cursorInd = nextCursorId
      ? filteredData.findIndex((it) => it.id === nextCursorId) + 1
      : 0

    return filteredData.slice(cursorInd, cursorInd + limit + 1)
  }

  swap(id1: number, id2: number) {
    const ind1 = this.data.findIndex((it) => it.id === id1)
    const ind2 = this.data.findIndex((it) => it.id === id2)

    if (ind1 === -1 || ind2 === -1) {
      throw new Error('Bad id')
    }

    const temp = this.data[ind1]!
    this.data[ind1] = this.data[ind2]!
    this.data[ind2] = temp

    return this.data
  }
}
