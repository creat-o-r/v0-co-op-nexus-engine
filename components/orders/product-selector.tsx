'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import {
  ChevronRight, ChevronDown, Search, Plus, Package, Tag, FolderOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface ProductType { id: string; name: string }
interface Product { id: string; name: string; unit: string; description: string | null }
interface CategoryNode {
  category: string
  types: { id: string; name: string; products: Product[] }[]
}

export interface ProductSelection {
  product_name: string
  product_id: string | null
  product_type_id: string | null
  category: string | null
  unit: string | null
  isNew: boolean
}

interface Props {
  value: ProductSelection
  onChange: (selection: ProductSelection) => void
  placeholder?: string
  autoFocus?: boolean
}

export function ProductSelector({ value, onChange, placeholder, autoFocus }: Props) {
  const { data } = useSWR('/api/products/tree', fetcher)
  const tree: CategoryNode[] = data?.tree || []
  const allTypes: ProductType[] = data?.allTypes || []
  const allProducts: Product[] = data?.allProducts || []

  const [query, setQuery] = useState(value.product_name || '')
  const [open, setOpen] = useState(false)
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Filter tree by query
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return tree

    return tree
      .map(cat => ({
        ...cat,
        types: cat.types
          .map(t => ({
            ...t,
            products: t.products.filter(p => p.name.toLowerCase().includes(q)),
          }))
          .filter(t => t.name.toLowerCase().includes(q) || t.products.length > 0),
      }))
      .filter(cat => cat.category.toLowerCase().includes(q) || cat.types.length > 0)
  }, [tree, query])

  // Check if query matches any existing product/type exactly
  const exactProductMatch = allProducts.find(p => p.name.toLowerCase() === query.toLowerCase().trim())
  const exactTypeMatch = allTypes.find(t => t.name.toLowerCase() === query.toLowerCase().trim())
  const hasExactMatch = !!exactProductMatch || !!exactTypeMatch
  const showAddNew = query.trim().length >= 2 && !hasExactMatch

  const selectProduct = (product: Product, type: { id: string; name: string }, category: string) => {
    onChange({
      product_name: product.name,
      product_id: product.id,
      product_type_id: type.id,
      category,
      unit: product.unit,
      isNew: false,
    })
    setQuery(product.name)
    setOpen(false)
  }

  const selectType = (type: { id: string; name: string }, category: string) => {
    onChange({
      product_name: type.name,
      product_id: null,
      product_type_id: type.id,
      category,
      unit: null,
      isNew: false,
    })
    setQuery(type.name)
    setOpen(false)
  }

  const selectNew = () => {
    onChange({
      product_name: query.trim(),
      product_id: null,
      product_type_id: null,
      category: null,
      unit: null,
      isNew: true,
    })
    setOpen(false)
  }

  const toggleCat = (cat: string) => {
    const next = new Set(expandedCats)
    next.has(cat) ? next.delete(cat) : next.add(cat)
    setExpandedCats(next)
  }

  const toggleType = (typeId: string) => {
    const next = new Set(expandedTypes)
    next.has(typeId) ? next.delete(typeId) : next.add(typeId)
    setExpandedTypes(next)
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          placeholder={placeholder || 'Search products, types, or add new...'}
          value={query}
          onChange={e => {
            setQuery(e.target.value)
            setOpen(true)
            if (!e.target.value.trim()) {
              onChange({ product_name: '', product_id: null, product_type_id: null, category: null, unit: null, isNew: false })
            }
          }}
          onFocus={() => setOpen(true)}
          className="pl-8 text-sm"
          autoFocus={autoFocus}
        />
      </div>

      {/* Selected badge */}
      {value.product_name && !open && (
        <div className="mt-1.5 flex items-center gap-1.5">
          {value.category && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{value.category}</span>
          )}
          {value.product_type_id && !value.product_id && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium flex items-center gap-1">
              <Tag className="h-2.5 w-2.5" />Type
            </span>
          )}
          {value.product_id && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium flex items-center gap-1">
              <Package className="h-2.5 w-2.5" />Product
            </span>
          )}
          {value.isNew && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-chart-3/10 text-chart-3 font-medium flex items-center gap-1">
              <Plus className="h-2.5 w-2.5" />New
            </span>
          )}
          {value.unit && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{value.unit}</span>
          )}
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border bg-background shadow-lg">
          {filtered.length === 0 && !showAddNew && (
            <div className="p-3 text-center text-xs text-muted-foreground">
              {query ? 'No matches found' : 'Loading products...'}
            </div>
          )}

          {filtered.map(cat => (
            <div key={cat.category}>
              {/* Category header */}
              <button
                onClick={() => toggleCat(cat.category)}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                {expandedCats.has(cat.category) || query.trim()
                  ? <ChevronDown className="h-3 w-3 shrink-0" />
                  : <ChevronRight className="h-3 w-3 shrink-0" />
                }
                <FolderOpen className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                <span className="uppercase tracking-wider">{cat.category}</span>
                <span className="ml-auto text-[10px] text-muted-foreground/50">{cat.types.length}</span>
              </button>

              {/* Types within category (auto-expand on search) */}
              {(expandedCats.has(cat.category) || query.trim()) && cat.types.map(type => (
                <div key={type.id}>
                  {/* Type row */}
                  <div className="flex items-center">
                    <button
                      onClick={() => type.products.length > 0 ? toggleType(type.id) : selectType(type, cat.category)}
                      className="flex flex-1 items-center gap-2 pl-7 pr-2 py-1.5 text-xs hover:bg-muted/50 transition-colors"
                    >
                      {type.products.length > 0 ? (
                        expandedTypes.has(type.id) || query.trim()
                          ? <ChevronDown className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />
                          : <ChevronRight className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />
                      ) : (
                        <Tag className="h-2.5 w-2.5 shrink-0 text-primary/60" />
                      )}
                      <span className="font-medium text-foreground">{type.name}</span>
                      {type.products.length > 0 && (
                        <span className="ml-auto text-[10px] text-muted-foreground/50">{type.products.length} variant{type.products.length !== 1 ? 's' : ''}</span>
                      )}
                    </button>
                    {/* Quick-select type button */}
                    <button
                      onClick={() => selectType(type, cat.category)}
                      className="px-2 py-1.5 text-[10px] text-primary hover:bg-primary/5 transition-colors"
                      title="Select this type"
                    >
                      Select
                    </button>
                  </div>

                  {/* Products within type */}
                  {(expandedTypes.has(type.id) || query.trim()) && type.products.map(product => (
                    <button
                      key={product.id}
                      onClick={() => selectProduct(product, type, cat.category)}
                      className="flex w-full items-center gap-2 pl-14 pr-3 py-1.5 text-xs hover:bg-primary/5 transition-colors"
                    >
                      <Package className="h-2.5 w-2.5 shrink-0 text-primary/50" />
                      <span className="text-foreground">{product.name}</span>
                      <span className="ml-auto text-[10px] text-muted-foreground">{product.unit}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          ))}

          {/* Add new option */}
          {showAddNew && (
            <button
              onClick={selectNew}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-xs font-medium text-chart-3 hover:bg-chart-3/5 border-t transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add &ldquo;{query.trim()}&rdquo; as new product
            </button>
          )}
        </div>
      )}
    </div>
  )
}
