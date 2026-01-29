"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DataTablePagination } from "./data-table-pagination"
import { DataTableToolbar } from "./data-table-toolbar"
import { DataTableViewOptions } from "./data-table-view-options"
import { cn } from "@/app/_lib/utils"

/**
 * CSVカラム設定
 */
export interface CsvColumnConfig<TData> {
  /** CSVヘッダー名 */
  header: string
  /** データ取得方法（キーまたは関数） */
  accessor: keyof TData | ((row: TData) => unknown)
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  enableSorting?: boolean
  enableFiltering?: boolean
  enablePagination?: boolean
  enableColumnVisibility?: boolean
  pageSize?: number
  globalFilterFn?: (row: any, columnId: string, filterValue: any) => boolean
  getRowClassName?: (row: TData) => string
  /** CSVエクスポート機能を有効化 */
  enableCsvExport?: boolean
  /** CSVファイル名のプレフィックス（デフォルト: "data"） */
  csvFilenamePrefix?: string
  /** CSVカラム設定（省略時は表示カラムから自動生成） */
  csvColumnAccessors?: CsvColumnConfig<TData>[]
  /** ヘッダー行をスクロール時に固定表示する（デフォルト: false） */
  enableStickyHeader?: boolean
  /** テーブルの最大高さ（例: "calc(100vh - 300px)"）。指定時は縦スクロールが有効になる */
  maxHeight?: string
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  enableSorting = true,
  enableFiltering = true,
  enablePagination = true,
  enableColumnVisibility = true,
  pageSize = 10,
  globalFilterFn,
  getRowClassName,
  enableCsvExport = false,
  csvFilenamePrefix = "data",
  csvColumnAccessors,
  enableStickyHeader = false,
  maxHeight,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize,
  })
  const [globalFilter, setGlobalFilter] = React.useState("")

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: enablePagination
      ? getPaginationRowModel()
      : undefined,
    onSortingChange: enableSorting ? setSorting : undefined,
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    onColumnFiltersChange: enableFiltering ? setColumnFilters : undefined,
    getFilteredRowModel: enableFiltering ? getFilteredRowModel() : undefined,
    onColumnVisibilityChange: enableColumnVisibility
      ? setColumnVisibility
      : undefined,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: enablePagination ? setPagination : undefined,
    onGlobalFilterChange: !searchKey ? setGlobalFilter : undefined,
    globalFilterFn: globalFilterFn,
    state: {
      sorting: enableSorting ? sorting : undefined,
      columnFilters: enableFiltering ? columnFilters : undefined,
      columnVisibility: enableColumnVisibility ? columnVisibility : undefined,
      rowSelection,
      pagination: enablePagination ? pagination : undefined,
      globalFilter: !searchKey ? globalFilter : undefined,
    },
  })

  return (
    <div className="space-y-2">
      {(enableFiltering || enableColumnVisibility || enableCsvExport) && (
        <div className="flex items-center justify-between py-1">
          {enableFiltering && searchKey && (
            <DataTableToolbar
              table={table}
              searchKey={searchKey}
              enableCsvExport={enableCsvExport}
              csvFilenamePrefix={csvFilenamePrefix}
              csvColumnAccessors={csvColumnAccessors}
              data={data}
            />
          )}
          {!enableFiltering && enableCsvExport && (
            <DataTableToolbar
              table={table}
              enableCsvExport={enableCsvExport}
              csvFilenamePrefix={csvFilenamePrefix}
              csvColumnAccessors={csvColumnAccessors}
              data={data}
            />
          )}
          {enableColumnVisibility && <DataTableViewOptions table={table} />}
        </div>
      )}
      <div 
        className={cn(
          "rounded-md border overflow-auto flex-1 min-h-0",
          maxHeight && "overflow-y-auto"
        )}
        style={maxHeight ? { maxHeight } : undefined}
      >
        <Table className="min-w-max">
          <TableHeader className={cn(
            "sticky top-0 bg-background z-10",
            enableStickyHeader && "border-b"
          )}>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead 
                      key={header.id} 
                      className={cn(
                        "whitespace-nowrap",
                        enableStickyHeader && "bg-background"
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const rowClassName = getRowClassName
                  ? getRowClassName(row.original)
                  : "";
                return (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className={rowClassName}
                  >
                    {row.getVisibleCells().map((cell) => {
                      return (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  結果が見つかりませんでした。
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {enablePagination && (
        <div>
          <DataTablePagination table={table} />
        </div>
      )}
    </div>
  )
}
