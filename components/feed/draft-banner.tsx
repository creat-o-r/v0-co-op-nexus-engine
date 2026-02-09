'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileEdit, Check, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FeedItemDraft, Profile } from '@/lib/types/database'
import useSWR from 'swr'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) return { drafts: [] }
  return res.json()
}

interface DraftBannerProps {
  feedItemId: string
  currentUserId?: string
}

export function DraftBanner({ feedItemId, currentUserId }: DraftBannerProps) {
  const { data, mutate } = useSWR<{ drafts: FeedItemDraft[] }>(
    `/api/scenarios/drafts?feedItemId=${feedItemId}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )

  const pendingDrafts = (data?.drafts || []).filter(d => d.status === 'pending')

  if (pendingDrafts.length === 0) return null

  return (
    <div className="space-y-1.5">
      {pendingDrafts.map(draft => (
        <DraftItem
          key={draft.id}
          draft={draft}
          currentUserId={currentUserId}
          onAction={() => mutate()}
        />
      ))}
    </div>
  )
}

function DraftItem({ draft, currentUserId, onAction }: {
  draft: FeedItemDraft
  currentUserId?: string
  onAction: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)

  const isProposer = draft.proposed_by === currentUserId
  const alreadyVoted = draft.approvals?.some(a => a.user_id === currentUserId)
  const canVote = !isProposer && !alreadyVoted

  const handleVote = async (approved: boolean) => {
    const setter = approved ? setIsApproving : setIsRejecting
    setter(true)
    try {
      await fetch(`/api/scenarios/drafts/${draft.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved }),
      })
      onAction()
    } finally {
      setter(false)
    }
  }

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 px-3 py-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 text-left"
      >
        <FileEdit className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-amber-800 dark:text-amber-300 truncate">
            Pending edit
            {draft.proposed_by_profile?.display_name && (
              <span className="font-normal text-amber-600 dark:text-amber-400">
                {' '}by {draft.proposed_by_profile.display_name}
              </span>
            )}
          </p>
          <p className="text-[10px] text-amber-600/70 dark:text-amber-400/70 tabular-nums">
            {draft.approvals_received}/{draft.approvals_needed} approvals
          </p>
        </div>
        {expanded
          ? <ChevronUp className="h-3 w-3 text-amber-500 shrink-0" />
          : <ChevronDown className="h-3 w-3 text-amber-500 shrink-0" />}
      </button>

      {expanded && (
        <div className="mt-2 pt-2 border-t border-amber-500/20 space-y-2">
          {draft.change_summary && (
            <p className="text-xs text-amber-700 dark:text-amber-300">{draft.change_summary}</p>
          )}

          {/* Diff preview */}
          <div className="space-y-1">
            <p className="text-[10px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">Proposed changes</p>
            <div className="text-xs text-foreground space-y-0.5">
              <p><span className="text-muted-foreground">Title:</span> {draft.draft_title}</p>
              {draft.draft_question && (
                <p><span className="text-muted-foreground">Question:</span> {draft.draft_question}</p>
              )}
              {draft.draft_options && (
                <p><span className="text-muted-foreground">Options:</span> {(draft.draft_options as string[]).join(', ')}</p>
              )}
            </div>
          </div>

          {/* Approval statuses */}
          {draft.approvals && draft.approvals.length > 0 && (
            <div className="space-y-0.5">
              <p className="text-[10px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">Votes</p>
              {draft.approvals.map((approval) => (
                <div key={approval.id} className="flex items-center gap-1.5 text-xs">
                  {approval.approved
                    ? <Check className="h-3 w-3 text-primary" />
                    : <X className="h-3 w-3 text-destructive" />}
                  <span className="text-foreground">
                    {(approval as unknown as { profile?: Profile }).profile?.display_name || 'Collaborator'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Vote actions */}
          {canVote && (
            <div className="flex gap-1.5 pt-1">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-7 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                onClick={() => handleVote(false)}
                disabled={isRejecting || isApproving}
              >
                {isRejecting ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3 mr-1" />}
                Reject
              </Button>
              <Button
                size="sm"
                className="flex-1 h-7 text-xs"
                onClick={() => handleVote(true)}
                disabled={isApproving || isRejecting}
              >
                {isApproving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                Approve
              </Button>
            </div>
          )}

          {isProposer && (
            <p className="text-[10px] text-amber-600/70 dark:text-amber-400/70 italic">
              Waiting for collaborators to review your proposal.
            </p>
          )}

          {alreadyVoted && !isProposer && (
            <p className="text-[10px] text-amber-600/70 dark:text-amber-400/70 italic">
              You already voted on this draft.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
