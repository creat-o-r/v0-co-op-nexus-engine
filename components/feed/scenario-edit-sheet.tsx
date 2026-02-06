'use client'

import { useState, useEffect } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { X, Plus, Loader2, FileEdit, FilePlus } from 'lucide-react'
import type { FeedItem } from '@/lib/types/database'

interface ScenarioEditSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: FeedItem | null  // null = create new
  agreementId: string
  onDraftCreated?: () => void
}

export function ScenarioEditSheet({
  open,
  onOpenChange,
  item,
  agreementId,
  onDraftCreated,
}: ScenarioEditSheetProps) {
  const isNew = !item
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState<string[]>([])
  const [taggedProducts, setTaggedProducts] = useState<string[]>([])
  const [newProduct, setNewProduct] = useState('')
  const [changeSummary, setChangeSummary] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Populate form when item changes
  useEffect(() => {
    if (item) {
      setTitle(item.title || '')
      setContent(item.content || '')
      setQuestion(item.scenario_question || '')
      setOptions(item.scenario_options || [])
      setTaggedProducts(item.tagged_products || [])
    } else {
      setTitle('')
      setContent('')
      setQuestion('')
      setOptions([''])
      setTaggedProducts([])
    }
    setChangeSummary('')
    setError(null)
    setSuccess(false)
  }, [item, open])

  const handleAddOption = () => setOptions([...options, ''])
  const handleRemoveOption = (index: number) => setOptions(options.filter((_, i) => i !== index))
  const handleOptionChange = (index: number, value: string) => {
    const next = [...options]
    next[index] = value
    setOptions(next)
  }

  const handleAddProduct = () => {
    const trimmed = newProduct.trim()
    if (trimmed && !taggedProducts.includes(trimmed)) {
      setTaggedProducts([...taggedProducts, trimmed])
      setNewProduct('')
    }
  }

  const handleSubmit = async () => {
    if (!title.trim()) { setError('Title is required'); return }

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/scenarios/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedItemId: item?.id || null,
          agreementId,
          title: title.trim(),
          content: content.trim() || null,
          question: question.trim() || null,
          options: options.filter(o => o.trim()).length > 0
            ? options.filter(o => o.trim())
            : null,
          taggedProducts,
          taggedHubs: [],
          changeSummary: changeSummary.trim() || null,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to create draft')
      }

      setSuccess(true)
      onDraftCreated?.()
      setTimeout(() => onOpenChange(false), 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2 text-foreground">
            {isNew ? <FilePlus className="h-4 w-4" /> : <FileEdit className="h-4 w-4" />}
            {isNew ? 'Propose New Scenario' : 'Propose Edit'}
          </SheetTitle>
          <SheetDescription>
            {isNew
              ? 'Create a new scenario. It will go live once all collaborators approve.'
              : 'Edit this scenario. Changes go live once all collaborators approve.'}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="draft-title" className="text-foreground">Title</Label>
            <Input
              id="draft-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Scenario title..."
              className="bg-card"
            />
          </div>

          {/* Question */}
          <div className="space-y-1.5">
            <Label htmlFor="draft-question" className="text-foreground">Question</Label>
            <Input
              id="draft-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="The question to ask..."
              className="bg-card"
            />
          </div>

          {/* Options */}
          <div className="space-y-1.5">
            <Label className="text-foreground">Options</Label>
            <div className="space-y-1.5">
              {options.map((option, index) => (
                <div key={index} className="flex gap-1.5">
                  <Input
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="bg-card"
                  />
                  {options.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 h-9 w-9 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveOption(index)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddOption}
                className="w-full border-dashed"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add option
              </Button>
            </div>
          </div>

          {/* Tagged Products */}
          <div className="space-y-1.5">
            <Label className="text-foreground">Tagged Products</Label>
            {taggedProducts.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {taggedProducts.map((product) => (
                  <span
                    key={product}
                    className="inline-flex items-center gap-1 rounded-full bg-accent/30 px-2 py-0.5 text-xs text-accent-foreground"
                  >
                    {product}
                    <button
                      type="button"
                      onClick={() => setTaggedProducts(taggedProducts.filter(p => p !== product))}
                      className="hover:text-destructive transition-colors"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-1.5">
              <Input
                value={newProduct}
                onChange={(e) => setNewProduct(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddProduct() } }}
                placeholder="Product type name..."
                className="bg-card"
              />
              <Button type="button" variant="outline" size="sm" onClick={handleAddProduct} className="shrink-0">
                Add
              </Button>
            </div>
          </div>

          {/* Content / notes */}
          <div className="space-y-1.5">
            <Label htmlFor="draft-content" className="text-foreground">Additional context (optional)</Label>
            <Textarea
              id="draft-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Extra context or description..."
              rows={2}
              className="bg-card resize-none"
            />
          </div>

          {/* Change summary */}
          {!isNew && (
            <div className="space-y-1.5">
              <Label htmlFor="draft-summary" className="text-foreground">What changed? (helps collaborators review)</Label>
              <Input
                id="draft-summary"
                value={changeSummary}
                onChange={(e) => setChangeSummary(e.target.value)}
                placeholder="Brief description of changes..."
                className="bg-card"
              />
            </div>
          )}

          {/* Error / Success */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          {success && (
            <p className="text-sm text-primary">Draft submitted for approval.</p>
          )}

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || success || !title.trim()}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : success ? (
              'Submitted'
            ) : (
              isNew ? 'Propose Scenario' : 'Submit for Approval'
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
